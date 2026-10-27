-- Payment checkout drafts are created before Razorpay opens because the order
-- number is needed to create the gateway order. If the customer dismisses or
-- fails payment, close that unpaid draft without generating an admin alert.
create or replace function public.cancel_unpaid_online_order(
  p_order_number text
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
  v_cancelled_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel this payment attempt';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = v_user_id
   for update;
  if not found then
    raise exception 'Order not found or you do not have permission to cancel it';
  end if;
  if v_order.payment_method <> 'PAY_ONLINE' then
    raise exception 'Only an online payment draft can be closed';
  end if;
  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    raise exception 'A paid order cannot be closed as an unpaid payment attempt';
  end if;
  if v_order.status = 'CANCELLED' then
    return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status);
  end if;
  if v_order.status <> 'NEW' then
    raise exception 'Only a new unpaid online order can be closed';
  end if;

  update public.orders
     set status = 'CANCELLED'
   where id = v_order.id
   returning * into v_order;
  v_cancelled_at := now();

  update public.order_status_history h
     set note = 'Online payment cancelled before capture'
   where h.order_id = v_order.id
     and h.to_status = 'CANCELLED'
     and h.changed_by = v_user_id
     and h.note = 'Order status updated';

  -- Deliberately do not insert into public.notifications: this is a failed
  -- payment attempt, not a customer order that needs admin attention.
  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'cancelled_at', v_cancelled_at
  );
end;
$$;

revoke all on function public.cancel_unpaid_online_order(text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_online_order(text) to authenticated;
