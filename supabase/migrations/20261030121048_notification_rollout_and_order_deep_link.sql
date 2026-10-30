-- Record the installed client version so data-only FCM can be enabled only for the new native renderer.
alter table public.push_devices add column if not exists app_version text;

-- Newly placed pickup-order notifications should open that order, not /profile.
update public.notifications n
   set action_url = '/my-order/order/' || o.order_slug
  from public.orders o
 where n.user_id = o.user_id
   and n.kind = 'order'
   and n.action_url in ('/profile', '/my-orders/' || o.order_number)
   and o.order_slug is not null
   and btrim(o.order_slug) <> ''
   and (n.title || ' ' || n.body) like '%' || o.order_number || '%';

create or replace function public.notify_new_pickup_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, action_url)
  values (
    new.user_id,
    'order',
    'Order received',
    'Your store-pickup order #' || new.order_number || ' has been received.',
    case
      when new.order_slug is not null and btrim(new.order_slug) <> ''
        then '/my-order/order/' || new.order_slug
      else '/notifications'
    end
  );
  return new;
end;
$$;

revoke all on function public.notify_new_pickup_order() from public, anon, authenticated;
