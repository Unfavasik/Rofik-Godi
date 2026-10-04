-- Restore the admin-only dashboard metrics RPC. The live project was missing
-- this function, leaving the orders list populated while KPI cards stayed blank.
create or replace function public.admin_dashboard_metrics()
returns jsonb
language sql
stable
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
