-- Customer order links use an opaque, unguessable key; authorization remains enforced by RLS.
alter table public.orders
  add column if not exists order_slug text;

update public.orders
   set order_slug = replace(gen_random_uuid()::text, '-', '')
 where order_slug is null or btrim(order_slug) = '';

alter table public.orders
  alter column order_slug set default replace(gen_random_uuid()::text, '-', ''),
  alter column order_slug set not null;

create unique index if not exists orders_order_slug_uidx
  on public.orders (order_slug);

comment on column public.orders.order_slug is
  'Opaque unique customer deep-link key. It is not an authorization token; customer reads remain limited by orders_customer_read RLS.';

-- Replace existing customer notification deep links without changing their displayed order numbers.
update public.notifications n
   set action_url = '/my-order/order/' || o.order_slug
  from public.orders o
 where n.user_id = o.user_id
   and n.action_url = '/my-orders/' || o.order_number;

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
      '/my-order/order/' || new.order_slug
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_customer_when_pickup_order_ready() from public, anon, authenticated;
