-- Customer-initiated activity is the canonical source for admin FCM pushes.
-- Admin-authored events remain in the Activity Log but must not ring the bell
-- or send an FCM notification back to an administrator.
create or replace function public.trg_admin_event_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_secret text;
begin
  -- Match the feed's source split: explicit admin actors are Activity Log only;
  -- anonymous/system events are also log-only except legacy anonymous reviews.
  if new.actor_user_id is null then
    if new.event_type <> 'review_created' then return new; end if;
  elsif exists (
    select 1 from public.admin_users admins
    where admins.user_id = new.actor_user_id and admins.role = 'admin'
  ) then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  perform net.http_post(
    url := 'https://cyijfvylyhhusackvcuj.supabase.co/functions/v1/send-admin-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'id', new.id,
      'event_type', new.event_type,
      'entity_type', new.entity_type,
      'entity_id', new.entity_id,
      'actor_user_id', new.actor_user_id,
      'title', new.title,
      'body', new.body,
      'details', new.details
    )
  );
  return new;
exception when others then
  -- Push delivery must never block creation of the original activity event.
  return new;
end;
$$;
revoke all on function public.trg_admin_event_push() from public, anon, authenticated;

-- Older support/order helpers also wrote admin-targeted rows to notifications.
-- Those rows triggered a second FCM webhook while the activity event already
-- delivers the canonical admin push. Keep admin history in admin_activity_events.
create or replace function public.skip_admin_notification_outbox_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
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
