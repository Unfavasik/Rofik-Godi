-- Admin access remains tied to auth.users UUIDs, not editable email strings.
-- This preserves RLS security while allowing an existing admin to grant a role by Gmail.
create or replace function public.grant_admin_by_email(p_email text, p_display_name text default null, p_role text default 'admin')
returns public.admin_users language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid; v_admin public.admin_users;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if lower(trim(p_role)) not in ('admin', 'manager') then raise exception 'Invalid administrator role'; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then raise exception 'No Supabase Auth user exists for this email'; end if;
  insert into public.admin_users (user_id, display_name, role)
  values (v_user_id, nullif(trim(p_display_name), ''), lower(trim(p_role)))
  on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role
  returning * into v_admin;
  return v_admin;
end;
$$;
revoke all on function public.grant_admin_by_email(text, text, text) from public, anon;
grant execute on function public.grant_admin_by_email(text, text, text) to authenticated;
