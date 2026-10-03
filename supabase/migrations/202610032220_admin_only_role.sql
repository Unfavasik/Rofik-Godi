-- Only the admin role may access protected admin policies and the admin panel.
-- Existing manager memberships are removed rather than silently retaining broad privileges.
delete from public.admin_users where role = 'manager';

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check (role = 'admin');

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.grant_admin_by_email(p_email text, p_display_name text default null, p_role text default 'admin')
returns public.admin_users language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_admin public.admin_users;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if lower(trim(coalesce(p_role, ''))) <> 'admin' then
    raise exception 'Only the admin role is supported';
  end if;
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
  if v_user_id is null then
    raise exception 'No Supabase Auth user exists for this email';
  end if;
  insert into public.admin_users (user_id, display_name, role)
  values (v_user_id, nullif(trim(p_display_name), ''), 'admin')
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        role = 'admin'
  returning * into v_admin;
  return v_admin;
end;
$$;
revoke all on function public.grant_admin_by_email(text, text, text) from public, anon;
grant execute on function public.grant_admin_by_email(text, text, text) to authenticated;
