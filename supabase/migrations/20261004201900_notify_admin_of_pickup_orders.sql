-- Keep the existing customer receipt and also notify each admin about new orders.
create or replace function public.notify_new_pickup_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, action_url)
  values (new.user_id, 'order', 'Order received',
          'Your store-pickup order #' || new.order_number || ' has been received.', '/profile');

  insert into public.notifications (user_id, kind, title, body, action_url)
  select au.user_id, 'order', 'New pickup order',
         'New pickup order #' || new.order_number || ' from ' || coalesce(new.customer_name, 'Customer') || '.',
         '/admin'
    from public.admin_users au
   where au.user_id is distinct from new.user_id;

  return new;
end;
$$;

-- Backfill recent orders created before admin notifications were wired up.
insert into public.notifications (user_id, kind, title, body, action_url)
select au.user_id, 'order', 'New pickup order',
       'New pickup order #' || o.order_number || ' from ' || coalesce(o.customer_name, 'Customer') || '.',
       '/admin'
  from public.admin_users au
 cross join public.orders o
 where o.created_at >= now() - interval '24 hours'
   and au.user_id is distinct from o.user_id
   and not exists (
     select 1
       from public.notifications n
      where n.user_id = au.user_id
        and n.kind = 'order'
        and n.title = 'New pickup order'
        and n.body = 'New pickup order #' || o.order_number || ' from ' || coalesce(o.customer_name, 'Customer') || '.'
        and n.action_url = '/admin'
   );
