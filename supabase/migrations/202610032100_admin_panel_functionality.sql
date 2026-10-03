-- Production admin dashboard support. No existing data is deleted or reset.
create or replace function public.admin_dashboard_metrics()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'total_orders', (select count(*) from public.orders),
    'pending_orders', (select count(*) from public.orders where status not in ('COMPLETED', 'CANCELLED')),
    'completed_orders', (select count(*) from public.orders where status = 'COMPLETED'),
    'cancelled_orders', (select count(*) from public.orders where status = 'CANCELLED'),
    'total_revenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED'), 0),
    'verified_payments', (select count(*) from public.orders where upper(payment_status) = 'PAID'),
    'total_customers', (select count(*) from public.profiles),
    'total_products', (select count(*) from public.products where is_active = true)
  )
  where public.is_admin();
$$;
revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

create or replace function public.notify_admin_new_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  select au.user_id, 'order', 'New pickup order', 'Order #' || new.order_number || ' needs attention.', '/admin', now() + interval '30 days'
    from public.admin_users au;
  return new;
end;
$$;
revoke all on function public.notify_admin_new_order() from public, anon, authenticated;
drop trigger if exists orders_notify_admin_new_order on public.orders;
create trigger orders_notify_admin_new_order after insert on public.orders for each row execute function public.notify_admin_new_order();
