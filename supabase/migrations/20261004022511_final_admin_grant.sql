-- Final override for historical grant_admin_by_email definitions.
-- Keep administrator grants admin-only, require confirmed accounts, and audit every change.
create table if not exists public.admin_role_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  target_user_id uuid not null,
  target_email text not null,
  action text not null check (action in ('GRANTED', 'UPDATED')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.admin_role_audit_log enable row level security;
revoke all on public.admin_role_audit_log from public, anon;
grant select on public.admin_role_audit_log to authenticated;

drop policy if exists "Admins can read admin role audit log" on public.admin_role_audit_log;
create policy "Admins can read admin role audit log"
  on public.admin_role_audit_log for select to authenticated
  using (public.is_admin());

create or replace function public.grant_admin_by_email(
  p_email text,
  p_display_name text default null,
  p_role text default 'admin'
)
returns public.admin_users
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_admin public.admin_users;
  v_target_email text;
  v_action text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if lower(trim(coalesce(p_role, ''))) <> 'admin' then
    raise exception 'Only the admin role is supported';
  end if;

  select id, email into v_user_id, v_target_email
  from auth.users
  where lower(email) = lower(trim(p_email))
    and email_confirmed_at is not null
  limit 1;
  if v_user_id is null then
    raise exception 'No confirmed Supabase Auth user exists for this email';
  end if;

  select case when exists (
    select 1 from public.admin_users where user_id = v_user_id
  ) then 'UPDATED' else 'GRANTED' end
  into v_action;

  insert into public.admin_users (user_id, display_name, role)
  values (v_user_id, nullif(trim(p_display_name), ''), 'admin')
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, admin_users.display_name),
        role = 'admin'
  returning * into v_admin;

  insert into public.admin_role_audit_log (
    actor_user_id,
    target_user_id,
    target_email,
    action,
    display_name
  )
  values (
    auth.uid(),
    v_user_id,
    coalesce(v_target_email, lower(trim(p_email))),
    v_action,
    v_admin.display_name
  );

  return v_admin;
end;
$$;

revoke all on function public.grant_admin_by_email(text, text, text) from public, anon;
grant execute on function public.grant_admin_by_email(text, text, text) to authenticated;
