-- Online payments require a recorded UPI transaction reference. Preserve the
-- legacy one-argument endpoint for store payments; it delegates to the same
-- checks and therefore fails closed for online orders without a reference.

create or replace function public.admin_verify_pickup_payment_v2(
  p_order_number text,
  p_provider_reference text default null
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
  v_provider_reference text := upper(trim(coalesce(p_provider_reference, '')));
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
  if v_order.payment_method = 'PAY_ONLINE' and v_provider_reference !~ '^[A-Z0-9/-]{6,64}$' then
    raise exception 'Enter the UPI transaction reference (6 to 64 letters, digits, / or -)';
  end if;
  if v_order.payment_method = 'PAY_ONLINE' then
    perform pg_advisory_xact_lock(hashtextextended('UPI:' || v_provider_reference, 0));
  end if;
  if v_order.payment_method = 'PAY_ONLINE' and exists (
    select 1 from public.payments p where p.provider = 'UPI' and p.provider_payment_id = v_provider_reference
  ) then
    raise exception 'This UPI transaction reference has already been recorded';
  end if;

  update public.orders o
     set payment_status = 'PAID'
   where o.id = v_order.id;

  insert into public.payments (order_id, provider, provider_payment_id, status, amount, currency, metadata)
  values (
    v_order.id,
    case when v_order.payment_method = 'PAY_ONLINE' then 'UPI' else 'STORE' end,
    case when v_order.payment_method = 'PAY_ONLINE' then v_provider_reference else null end,
    'paid',
    v_order.total,
    'INR',
    jsonb_build_object('verified_by', v_actor, 'verified_reference', nullif(v_provider_reference, ''))
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'pickup_payment_verified',
    'order',
    v_order.id::text,
    jsonb_build_object('order_number', v_order.order_number, 'payment_method', v_order.payment_method, 'amount', v_order.total, 'payment_reference', nullif(v_provider_reference, ''))
  );

  return jsonb_build_object('order_number', v_order.order_number, 'payment_status', 'PAID');
end;
$$;
revoke all on function public.admin_verify_pickup_payment_v2(text, text) from public, anon, authenticated;
grant execute on function public.admin_verify_pickup_payment_v2(text, text) to authenticated;

create or replace function public.admin_verify_pickup_payment(p_order_number text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.admin_verify_pickup_payment_v2(p_order_number, null);
$$;
revoke all on function public.admin_verify_pickup_payment(text) from public, anon, authenticated;
grant execute on function public.admin_verify_pickup_payment(text) to authenticated;
