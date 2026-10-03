-- Personalized welcome alerts, seven-day notification retention, and owner deletion.
-- The in-app notification is created by the auth trigger; no SMS is sent.

create extension if not exists pg_cron with schema pg_catalog;

alter table public.notifications
  add column if not exists expires_at timestamptz;

update public.notifications
   set expires_at = created_at + interval '7 days'
 where expires_at is null;

delete from public.notifications
 where expires_at <= now();

alter table public.notifications
  alter column expires_at set default (now() + interval '7 days');
alter table public.notifications
  alter column expires_at set not null;

create index if not exists notifications_user_expires_at_idx
  on public.notifications (user_id, expires_at);

-- Keep active alerts visible, and let each authenticated user delete only their own.
drop policy if exists notifications_own_read_update on public.notifications;
drop policy if exists notifications_own_mark_read on public.notifications;
create policy notifications_own_read_active
  on public.notifications for select to authenticated
  using (user_id = auth.uid() and expires_at > now());
create policy notifications_own_mark_read
  on public.notifications for update to authenticated
  using (user_id = auth.uid() and expires_at > now())
  with check (user_id = auth.uid());
create policy notifications_own_delete
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.create_welcome_notification_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Rider'), 120);
begin
  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  values (
    new.id,
    'welcome',
    'Welcome, ' || v_name || '!',
    'Hi ' || v_name || ', welcome to Rofik Godi Centre. Explore the store and find your ride essentials here.',
    '/home',
    now() + interval '7 days'
  );
  return new;
end;
$$;
revoke all on function public.create_welcome_notification_for_new_user() from public, anon, authenticated;
drop trigger if exists auth_user_welcome_notification on auth.users;
create trigger auth_user_welcome_notification
  after insert on auth.users
  for each row execute function public.create_welcome_notification_for_new_user();

-- Expired alerts disappear from user queries at the seven-day mark; this job removes
-- the expired rows from storage within an hour as well.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'delete-expired-user-notifications'
   limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'delete-expired-user-notifications',
    '17 * * * *',
    'delete from public.notifications where expires_at <= now();'
  );
end;
$$;
