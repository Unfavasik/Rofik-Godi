create or replace function public.notify_customer_when_pickup_order_ready()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'READY_FOR_PICKUP'
     and old.status is distinct from new.status
     and new.fulfillment_method = 'STORE_PICKUP'
     and new.user_id is not null then
    insert into public.notifications (user_id, kind, title, body, action_url)
    values (
      new.user_id,
      'order',
      'Ready for pickup',
      'Order #' || new.order_number || ' is ready for pickup. Open your order to view the pickup details.',
      '/my-orders/' || new.order_number
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_customer_when_pickup_order_ready() from public, anon, authenticated;

drop trigger if exists orders_notify_customer_ready_for_pickup on public.orders;
create trigger orders_notify_customer_ready_for_pickup
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.notify_customer_when_pickup_order_ready();
