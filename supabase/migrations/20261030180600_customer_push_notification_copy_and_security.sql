-- Keep order-status notifications anchored to the customer's real order detail page.
create or replace function public.notify_pickup_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, body, action_url)
    values (
      new.user_id,
      'order',
      case new.status
        when 'CONFIRMED' then '✅ Order confirmed'
        when 'PREPARING' then '🛠️ Your order is being prepared'
        when 'READY_FOR_PICKUP' then '📦 Your order is ready for pickup'
        when 'COMPLETED' then '🎉 Order completed'
        else '🔔 Order update'
      end,
      case new.status
        when 'CONFIRMED' then 'Your order #' || new.order_number || ' is confirmed. We’ll keep you updated.'
        when 'PREPARING' then 'Your order #' || new.order_number || ' is being prepared at Rofik Godi Centre.'
        when 'READY_FOR_PICKUP' then 'Your order #' || new.order_number || ' is ready at Rofik Godi Centre. Show your Pickup QR at the counter when you arrive.'
        when 'COMPLETED' then 'Order #' || new.order_number || ' has been successfully completed.'
        else 'Your order #' || new.order_number || ' is now ' || new.status || '.'
      end,
      case
        when new.order_slug ~* '^[0-9a-f]{32}$' then '/my-order/order/' || lower(new.order_slug)
        else '/my-orders'
      end
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

-- Notify the account owner about security-sensitive auth changes without exposing the changed values.
create or replace function public.notify_auth_security_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed_fields text[] := array[]::text[];
  v_notification_id uuid := gen_random_uuid();
  v_changed_summary text;
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    v_changed_fields := array_append(v_changed_fields, 'password');
  end if;
  if old.email is distinct from new.email then
    v_changed_fields := array_append(v_changed_fields, 'email address');
  end if;
  if old.phone is distinct from new.phone then
    v_changed_fields := array_append(v_changed_fields, 'phone number');
  end if;

  if cardinality(v_changed_fields) = 0 then
    return new;
  end if;

  v_changed_summary := array_to_string(v_changed_fields, ', ');
  insert into public.notifications (id, user_id, kind, title, body, action_url)
  values (
    v_notification_id,
    new.id,
    'security',
    '🔐 Important account update',
    'Your account or security settings have changed. Updated: ' || v_changed_summary || '. If you didn''t make these changes, tap Review Activity to check this alert.',
    '/notifications?notification=' || v_notification_id::text
  );
  return new;
end;
$$;

revoke all on function public.notify_auth_security_update() from public, anon, authenticated;
drop trigger if exists auth_user_security_notification on auth.users;
create trigger auth_user_security_notification
after update of encrypted_password, email, phone on auth.users
for each row execute function public.notify_auth_security_update();
