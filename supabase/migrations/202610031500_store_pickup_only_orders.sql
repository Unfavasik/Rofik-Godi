
create or replace function public.notify_pickup_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, body, action_url)
    values (new.user_id, 'order', case new.status when 'CONFIRMED' then 'Order Confirmed' when 'PREPARING' then 'Preparing' when 'READY_FOR_PICKUP' then 'Ready for Pickup' when 'COMPLETED' then 'Order Completed' else 'Pickup Order Update' end, case new.status when 'CONFIRMED' then 'Your order #' || new.order_number || ' has been confirmed.' when 'PREPARING' then 'Your order #' || new.order_number || ' is being prepared.' when 'READY_FOR_PICKUP' then 'Your order #' || new.order_number || ' is ready for pickup at Rofik Godi Centre.' when 'COMPLETED' then 'Order #' || new.order_number || ' has been successfully completed.' else 'Your order #' || new.order_number || ' is now ' || new.status || '.' end, '/account');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_pickup_order_status() from public, anon, authenticated;
drop trigger if exists orders_notify_pickup_status on public.orders;
create trigger orders_notify_pickup_status after update of status on public.orders for each row execute function public.notify_pickup_order_status();
