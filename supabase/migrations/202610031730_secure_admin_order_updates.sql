-- Route admin order mutations through narrowly scoped, server-authorized RPCs.
-- The functions run as the migration owner, validate the caller, lock the order,
-- and let existing triggers atomically record status history and notifications.

-- An authenticated admin must not be able to bypass the RPC and update arbitrary
-- order columns (or write payment rows directly from the browser).
drop policy if exists "orders_admin_update" on public.orders;
drop policy if exists "payments_admin_all" on public.payments;
drop policy if exists "payments_admin_read" on public.payments;
create policy "payments_admin_read"
  on public.payments for select to authenticated
  using (public.is_admin());
revoke update on table public.orders from public, anon, authenticated;
revoke insert, update, delete on table public.payments from public, anon, authenticated;

create or replace function public.admin_update_pickup_order_status(
  p_order_number text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_order_number text := regexp_replace(btrim(coalesce(p_order_number, '')), '^#', '');
  v_allowed boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;
  if p_status is null or p_status not in ('NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'CANCELLED') then
    raise exception 'Unsupported order status';
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Store-pickup order not found';
  end if;

  if v_order.status = p_status then
    return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status, 'unchanged', true);
  end if;

  v_allowed := case v_order.status
    when 'NEW' then p_status in ('CONFIRMED', 'CANCELLED')
    when 'CONFIRMED' then p_status in ('PREPARING', 'CANCELLED')
    when 'PREPARING' then p_status in ('READY_FOR_PICKUP', 'CANCELLED')
    when 'READY_FOR_PICKUP' then p_status in ('PICKED_UP', 'CANCELLED')
    when 'PICKED_UP' then p_status = 'COMPLETED'
    else false
  end;
  if not v_allowed then
    raise exception 'Invalid order status transition: % -> %', v_order.status, p_status;
  end if;

  update public.orders o
     set status = p_status,
         picked_up_at = case
           when p_status = 'PICKED_UP' then coalesce(v_order.picked_up_at, now())
           else v_order.picked_up_at
         end,
         completed_at = case
           when p_status = 'COMPLETED' then coalesce(v_order.completed_at, now())
           else v_order.completed_at
         end
   where o.id = v_order.id
   returning * into v_order;

  return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status);
end;
$$;
revoke all on function public.admin_update_pickup_order_status(text, text) from public, anon, authenticated;
grant execute on function public.admin_update_pickup_order_status(text, text) to authenticated;

create or replace function public.admin_verify_pickup_payment(
  p_order_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_order_number text := regexp_replace(btrim(coalesce(p_order_number, '')), '^#', '');
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Store-pickup order not found';
  end if;

  -- Idempotent retries must not create duplicate payment records.
  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    return jsonb_build_object('order_number', v_order.order_number, 'payment_status', 'PAID', 'already_verified', true);
  end if;
  if v_order.status = 'CANCELLED' then
    raise exception 'Payment cannot be verified for a cancelled order';
  end if;
  if upper(coalesce(v_order.payment_status, '')) <> 'PENDING' then
    raise exception 'Only pending payments can be verified';
  end if;
  if v_order.payment_method not in ('PAY_AT_STORE', 'PAY_ONLINE') then
    raise exception 'Unsupported payment method';
  end if;

  update public.orders o
     set payment_status = 'PAID'
   where o.id = v_order.id;

  insert into public.payments (order_id, provider, status, amount, currency, metadata)
  values (
    v_order.id,
    case when v_order.payment_method = 'PAY_ONLINE' then 'UPI' else 'STORE' end,
    'paid',
    v_order.total,
    'INR',
    jsonb_build_object('verified_by', v_actor)
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'pickup_payment_verified',
    'order',
    v_order.id::text,
    jsonb_build_object('order_number', v_order.order_number, 'payment_method', v_order.payment_method, 'amount', v_order.total)
  );

  return jsonb_build_object('order_number', v_order.order_number, 'payment_status', 'PAID');
end;
$$;
revoke all on function public.admin_verify_pickup_payment(text) from public, anon, authenticated;
grant execute on function public.admin_verify_pickup_payment(text) to authenticated;
