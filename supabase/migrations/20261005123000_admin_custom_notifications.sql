-- Admin-authored in-app announcements can include an optional image.
-- Keep recipient selection server-side so the browser cannot bypass admin checks.
alter table public.notifications
  add column if not exists image_url text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'notifications_image_url_http_check'
       and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_image_url_http_check
      check (image_url is null or image_url ~* '^https?://');
  end if;
end;
$$;

create or replace function public.admin_send_notification(
  p_title text,
  p_body text,
  p_kind text default 'announcement',
  p_action_url text default null,
  p_image_url text default null,
  p_user_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_kind text := lower(btrim(coalesce(p_kind, 'announcement')));
  v_action_url text := nullif(btrim(p_action_url), '');
  v_image_url text := nullif(btrim(p_image_url), '');
  v_requested_count integer;
  v_existing_count integer;
  v_sent_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required to send notifications';
  end if;

  if v_title = '' or char_length(v_title) > 120 then
    raise exception 'Notification title must contain 1 to 120 characters';
  end if;
  if v_body = '' or char_length(v_body) > 1000 then
    raise exception 'Notification message must contain 1 to 1000 characters';
  end if;
  if v_kind not in ('announcement', 'general', 'product', 'offer', 'update') then
    raise exception 'Unsupported notification type';
  end if;

  if v_action_url is not null then
    if char_length(v_action_url) > 2048
       or not ((left(v_action_url, 1) = '/' and left(v_action_url, 2) <> '//') or v_action_url ~* '^https?://') then
      raise exception 'Notification action link must be an internal path or an http(s) URL';
    end if;
  end if;
  if v_image_url is not null and (char_length(v_image_url) > 2048 or v_image_url !~* '^https?://') then
    raise exception 'Notification image must be an http(s) URL';
  end if;

  if p_user_ids is not null then
    if cardinality(p_user_ids) = 0 or array_position(p_user_ids, null) is not null then
      raise exception 'Select at least one valid customer';
    end if;
    select count(distinct requested.user_id)::integer
      into v_requested_count
      from unnest(p_user_ids) as requested(user_id);
    select count(distinct users.id)::integer
      into v_existing_count
      from auth.users as users
     where users.id = any(p_user_ids);
    if v_requested_count <> v_existing_count then
      raise exception 'One or more selected customers no longer exist';
    end if;
  end if;

  insert into public.notifications (user_id, kind, title, body, action_url, image_url)
  select users.id, v_kind, v_title, v_body, v_action_url, v_image_url
    from auth.users as users
   where p_user_ids is null or users.id = any(p_user_ids);

  get diagnostics v_sent_count = row_count;
  return v_sent_count;
end;
$$;

revoke all on function public.admin_send_notification(text, text, text, text, text, uuid[]) from public, anon;
grant execute on function public.admin_send_notification(text, text, text, text, text, uuid[]) to authenticated;
