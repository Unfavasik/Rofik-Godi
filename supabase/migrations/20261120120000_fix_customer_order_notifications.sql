-- Ensure customers reliably receive notifications for order placement, status
-- transitions, and payment confirmation, and enable Realtime updates on orders.

-- 1. Keep active customer notifications readable even if a legacy row has null
--    expires_at; server-side now() remains the single source of truth.
drop policy if exists notifications_own_read_active on public.notifications;
create policy notifications_own_read_active
  on public.notifications for select to authenticated
  using (user_id = auth.uid() and (expires_at is null or expires_at > now()));

drop policy if exists notifications_own_mark_read on public.notifications;
create policy notifications_own_mark_read
  on public.notifications for update to authenticated
  using (user_id = auth.uid() and (expires_at is null or expires_at > now()))
  with check (user_id = auth.uid());

-- 2. Only suppress legacy admin-targeted alert rows in public.notifications
--    (admin alerts live in admin_activity_events). Customer-facing order,
--    support, and account notifications must never be dropped even if the
--    ordering user also holds an admin role.
create or replace function public.skip_admin_notification_outbox_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action_url text := lower(btrim(coalesce(new.action_url, '')));
  v_title text := lower(btrim(coalesce(new.title, '')));
  v_is_admin_targeted boolean := (
    v_action_url = '/admin'
    or v_action_url like '/admin/%'
    or v_title in (
      'new pickup order',
      'order cancelled by customer',
      'new customer support request'
    )
  );
begin
  if v_is_admin_targeted and exists (
    select 1 from public.admin_users admins
    where admins.user_id = new.user_id and admins.role = 'admin'
  ) then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function public.skip_admin_notification_outbox_row() from public, anon, authenticated;
drop trigger if exists notifications_skip_admin_outbox on public.notifications;
create trigger notifications_skip_admin_outbox
before insert on public.notifications
for each row execute function public.skip_admin_notification_outbox_row();

-- 3. Notify the customer immediately when a new pickup order is placed.
create or replace function public.notify_new_pickup_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  values (
    new.user_id,
    'order',
    'Order placed',
    'Your store-pickup order #' || new.order_number || ' has been received. We’ll notify you as soon as it is updated.',
    case
      when new.order_slug ~* '^[0-9a-f]{32}$' then '/my-order/order/' || lower(new.order_slug)
      else '/my-orders'
    end,
    now() + interval '7 days'
  );
  return new;
end;
$$;
revoke all on function public.notify_new_pickup_order() from public, anon, authenticated;
drop trigger if exists orders_notify_new_pickup_order on public.orders;
create trigger orders_notify_new_pickup_order
after insert on public.orders
for each row execute function public.notify_new_pickup_order();

-- 4. Remove duplicate READY_FOR_PICKUP trigger and keep a single canonical
--    order-status notification trigger covering every status transition.
drop trigger if exists orders_notify_customer_ready_for_pickup on public.orders;

create or replace function public.notify_pickup_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
    values (
      new.user_id,
      'order',
      case new.status
        when 'CONFIRMED' then 'Order confirmed'
        when 'PREPARING' then 'Your order is being prepared'
        when 'READY_FOR_PICKUP' then 'Your order is ready for pickup'
        when 'PICKED_UP' then 'Order picked up'
        when 'COMPLETED' then 'Order completed'
        when 'CANCELLED' then 'Order cancelled'
        else 'Order update'
      end,
      case new.status
        when 'CONFIRMED' then 'Your order #' || new.order_number || ' is confirmed. We’ll keep you updated.'
        when 'PREPARING' then 'Your order #' || new.order_number || ' is being prepared at Rofik Godi Centre.'
        when 'READY_FOR_PICKUP' then 'Your order #' || new.order_number || ' is ready at Rofik Godi Centre. Show your Pickup QR at the counter when you arrive.'
        when 'PICKED_UP' then 'Your order #' || new.order_number || ' has been marked as picked up.'
        when 'COMPLETED' then 'Order #' || new.order_number || ' has been successfully completed. Thank you for riding with us!'
        when 'CANCELLED' then 'Your order #' || new.order_number || ' has been cancelled.'
        else 'Your order #' || new.order_number || ' status was updated to ' || replace(lower(new.status), '_', ' ') || '.'
      end,
      case
        when new.order_slug ~* '^[0-9a-f]{32}$' then '/my-order/order/' || lower(new.order_slug)
        else '/my-orders'
      end,
      now() + interval '7 days'
    );
  end if;
  return new;
end;
$$;
revoke all on function public.notify_pickup_order_status() from public, anon, authenticated;
drop trigger if exists orders_notify_pickup_status on public.orders;
create trigger orders_notify_pickup_status
after update of status on public.orders
for each row execute function public.notify_pickup_order_status();

-- 5. Notify the customer when payment is verified / marked PAID.
create or replace function public.notify_pickup_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null
     and upper(coalesce(old.payment_status, '')) <> 'PAID'
     and upper(coalesce(new.payment_status, '')) = 'PAID' then
    insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
    values (
      new.user_id,
      'order',
      'Payment confirmed',
      'Payment for order #' || new.order_number || ' has been confirmed.',
      case
        when new.order_slug ~* '^[0-9a-f]{32}$' then '/my-order/order/' || lower(new.order_slug)
        else '/my-orders'
      end,
      now() + interval '7 days'
    );
  end if;
  return new;
end;
$$;
revoke all on function public.notify_pickup_order_payment() from public, anon, authenticated;
drop trigger if exists orders_notify_pickup_payment on public.orders;
create trigger orders_notify_pickup_payment
after update of payment_status on public.orders
for each row execute function public.notify_pickup_order_payment();

-- 6. Publish public.orders to Supabase Realtime so customers see live order
--    status and payment updates immediately while the app is open.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and exists (
       select 1
         from pg_class as relations
         join pg_namespace as schemas on schemas.oid = relations.relnamespace
        where schemas.nspname = 'public'
          and relations.relname = 'orders'
          and relations.relrowsecurity
     )
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'orders'
     ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end;
$$;
