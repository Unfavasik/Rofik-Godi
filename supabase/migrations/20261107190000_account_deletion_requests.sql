-- Customer-requested account deletion with a seven-day grace period.
-- Orders are retained only as anonymized business records; direct account data is removed.
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  reason text,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_reason_length check (reason is null or char_length(reason) <= 80),
  constraint account_deletion_feedback_length check (feedback is null or char_length(feedback) <= 300)
);

create index if not exists account_deletion_due_idx
  on public.account_deletion_requests (scheduled_for)
  where status = 'scheduled';

alter table public.account_deletion_requests enable row level security;
drop policy if exists account_deletion_requests_own_read on public.account_deletion_requests;
create policy account_deletion_requests_own_read
  on public.account_deletion_requests for select to authenticated
  using (user_id = auth.uid());
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

create or replace function public.request_account_deletion(p_reason text default null, p_feedback text default null)
returns table(scheduled_for timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 80), '');
  v_feedback text := nullif(left(btrim(coalesce(p_feedback, '')), 300), '');
  v_scheduled_for timestamptz := now() + interval '7 days';
begin
  if v_user_id is null then raise exception 'Sign in to request account deletion'; end if;
  insert into public.account_deletion_requests (user_id, status, requested_at, scheduled_for, cancelled_at, reason, feedback, updated_at)
  values (v_user_id, 'scheduled', now(), v_scheduled_for, null, v_reason, v_feedback, now())
  on conflict (user_id) do update set
    status = 'scheduled',
    requested_at = now(),
    scheduled_for = excluded.scheduled_for,
    cancelled_at = null,
    reason = excluded.reason,
    feedback = excluded.feedback,
    updated_at = now();
  return query select v_scheduled_for;
end;
$$;
revoke all on function public.request_account_deletion(text, text) from public, anon;
grant execute on function public.request_account_deletion(text, text) to authenticated;

create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Sign in to cancel account deletion'; end if;
  update public.account_deletion_requests
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where user_id = v_user_id and status = 'scheduled';
  return found;
end;
$$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function public.process_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_request record;
  v_count integer := 0;
begin
  for v_request in
    select user_id
      from public.account_deletion_requests
     where status = 'scheduled' and scheduled_for <= now()
     order by scheduled_for
     for update skip locked
  loop
    -- Admin identities are never removed by a customer self-service request.
    if exists (select 1 from public.admin_users where user_id = v_request.user_id) then
      update public.account_deletion_requests
         set status = 'cancelled', cancelled_at = now(), updated_at = now()
       where user_id = v_request.user_id;
      continue;
    end if;

    -- Remove customer-owned operational data before deleting the auth identity.
    delete from public.customer_support_messages
     where sender_user_id = v_request.user_id;
    delete from public.customer_support_requests
     where user_id = v_request.user_id;
    delete from public.coupon_usages
     where customer_id = v_request.user_id;
    delete from public.reviews
     where user_id = v_request.user_id or customer_id = v_request.user_id;
    delete from public.wishlists where user_id = v_request.user_id;
    delete from public.customer_addresses where user_id = v_request.user_id;
    delete from public.notifications where user_id = v_request.user_id;
    delete from public.push_devices where user_id = v_request.user_id;

    -- Keep order/payment records for accounting, but remove direct identifiers.
    update public.orders
       set customer_name = 'Deleted customer',
           customer_phone = 'Deleted',
           vehicle_model = null,
           vehicle_company = null,
           vehicle_type = null,
           vehicle_image_url = null,
           metadata = '{}'::jsonb,
           coupon_code = null,
           coupon_code_snapshot = null,
           user_id = null
     where user_id = v_request.user_id;

    delete from auth.users where id = v_request.user_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.process_account_deletions() from public, anon, authenticated;

select cron.unschedule('process-account-deletions')
where exists (select 1 from cron.job where jobname = 'process-account-deletions');
select cron.schedule(
  'process-account-deletions',
  '17 * * * *',
  $$select public.process_account_deletions();$$
);
