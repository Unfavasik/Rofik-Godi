-- Allow a customer to cancel their own new, unpaid store-pickup order.
-- Existing terminal-status triggers invalidate any pickup token atomically.
create or replace function public.cancel_my_order(
  p_order_number text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_order_number text := trim(coalesce(p_order_number, ''));
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_cancelled_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel this order';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;
  if length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Cancellation reason must be 500 characters or fewer';
  end if;

  -- Lock only the caller-owned row. This prevents both cross-customer access and
  -- concurrent status changes from bypassing the cancellation rules.
  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = v_user_id
   for update;
  if not found then
    raise exception 'Order not found or you do not have permission to cancel it';
  end if;
  if v_order.status <> 'NEW' then
    raise exception 'Only a new, unconfirmed order can be cancelled';
  end if;
  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    raise exception 'Paid orders cannot be cancelled online. Please contact the store';
  end if;

  update public.orders o
     set status = 'CANCELLED'
   where o.id = v_order.id
   returning o.* into v_order;
  v_cancelled_at := now();

  -- The existing order-status trigger records the transition; enrich its note
  -- with the optional customer reason without adding a second history row.
  update public.order_status_history h
     set note = case
       when v_reason is null then 'Cancelled by customer'
       else 'Customer cancellation: ' || v_reason
     end
   where h.order_id = v_order.id
     and h.to_status = 'CANCELLED'
     and h.changed_by = v_user_id
     and h.note = 'Order status updated';

  insert into public.notifications (user_id, kind, title, body, action_url)
  select au.user_id,
         'order',
         'Order cancelled by customer',
         'Customer cancelled order #' || v_order.order_number || '.' ||
           case when v_reason is null then '' else ' Reason: ' || v_reason end,
         '/admin/orders/' || v_order.order_number
    from public.admin_users au
   where au.user_id is distinct from v_user_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'cancelled_at', v_cancelled_at,
    'reason', v_reason
  );
end;
$$;

revoke all on function public.cancel_my_order(text, text) from public, anon, authenticated;
grant execute on function public.cancel_my_order(text, text) to authenticated;
