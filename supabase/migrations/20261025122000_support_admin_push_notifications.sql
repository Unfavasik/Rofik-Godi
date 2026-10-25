-- Deliver customer-support activity to every admin device as a native push notification.
-- The existing admin_activity_events triggers keep the in-app activity inbox intact;
-- these notifications feed the database webhook -> FCM delivery pipeline.

create or replace function public.notify_admins_of_support_request_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  select
    admins.user_id,
    'support',
    'New customer support request',
    left(format('%s submitted a %s support request: %s',
      coalesce((select full_name from public.profiles where id = new.user_id), 'A customer'),
      new.category,
      new.subject), 180),
    '/admin/activity',
    now() + interval '30 days'
  from public.admin_users admins;
  return new;
end;
$$;

revoke all on function public.notify_admins_of_support_request_push() from public, anon, authenticated;
drop trigger if exists support_requests_notify_admin_push on public.customer_support_requests;
create trigger support_requests_notify_admin_push
after insert on public.customer_support_requests
for each row execute function public.notify_admins_of_support_request_push();

create or replace function public.notify_admins_of_support_reply_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.customer_support_requests%rowtype;
  v_customer_name text;
  v_body text;
begin
  if new.is_initial or new.sender_role <> 'customer' then
    return new;
  end if;

  select * into v_request
  from public.customer_support_requests
  where id = new.request_id;
  if not found then
    return new;
  end if;

  select coalesce(nullif(full_name, ''), 'A customer') into v_customer_name
  from public.profiles
  where id = new.sender_user_id;
  v_body := left(format('%s replied to %s.', v_customer_name, v_request.subject), 180);

  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  select
    admins.user_id,
    'support',
    'Customer replied to support request',
    v_body,
    '/admin/activity',
    now() + interval '30 days'
  from public.admin_users admins;
  return new;
end;
$$;

revoke all on function public.notify_admins_of_support_reply_push() from public, anon, authenticated;
drop trigger if exists support_messages_notify_admin_push on public.customer_support_messages;
create trigger support_messages_notify_admin_push
after insert on public.customer_support_messages
for each row execute function public.notify_admins_of_support_reply_push();
