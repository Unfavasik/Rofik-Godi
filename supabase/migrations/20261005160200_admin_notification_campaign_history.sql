-- Group each broadcast's recipient rows so admins can see and retract a sent campaign.
alter table public.notifications
  add column if not exists campaign_id uuid;

create index if not exists notifications_campaign_id_idx
  on public.notifications (campaign_id, created_at desc)
  where campaign_id is not null;

-- The first admin composer migration did not yet store a group ID. Recover the
-- recent admin-authored rows by their shared transaction timestamp and payload.
with legacy_campaigns as (
  select
    kind,
    title,
    body,
    action_url,
    image_url,
    created_at,
    gen_random_uuid() as campaign_id
  from public.notifications
  where campaign_id is null
    and created_at >= timestamptz '2026-10-05 10:26:24+00'
    and (
      kind in ('announcement', 'general', 'product', 'offer', 'update')
      or (kind = 'coupon' and title like 'New offer:%')
    )
  group by kind, title, body, action_url, image_url, created_at
)
update public.notifications as notifications
   set campaign_id = legacy_campaigns.campaign_id
  from legacy_campaigns
 where notifications.campaign_id is null
   and notifications.kind = legacy_campaigns.kind
   and notifications.title = legacy_campaigns.title
   and notifications.body = legacy_campaigns.body
   and notifications.action_url is not distinct from legacy_campaigns.action_url
   and notifications.image_url is not distinct from legacy_campaigns.image_url
   and notifications.created_at = legacy_campaigns.created_at;

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
  v_campaign_id uuid := gen_random_uuid();
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
  insert into public.notifications (user_id, kind, title, body, action_url, image_url, campaign_id)
  select users.id, v_kind, v_title, v_body, v_action_url, v_image_url, v_campaign_id
    from auth.users as users
   where p_user_ids is null or users.id = any(p_user_ids);
  get diagnostics v_sent_count = row_count;
  return v_sent_count;
end;
$$;

create or replace function public.admin_list_notification_campaigns()
returns table (
  campaign_id uuid,
  kind text,
  title text,
  body text,
  action_url text,
  image_url text,
  created_at timestamptz,
  recipient_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    notifications.campaign_id,
    notifications.kind,
    notifications.title,
    notifications.body,
    notifications.action_url,
    notifications.image_url,
    min(notifications.created_at) as created_at,
    count(*) as recipient_count
  from public.notifications as notifications
  where notifications.campaign_id is not null
    and notifications.expires_at > now()
    and public.is_admin()
  group by notifications.campaign_id, notifications.kind, notifications.title,
           notifications.body, notifications.action_url, notifications.image_url
  order by min(notifications.created_at) desc
  limit 100;
$$;

create or replace function public.admin_delete_notification_campaign(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required to delete notifications';
  end if;
  if p_campaign_id is null then
    raise exception 'Notification campaign not found';
  end if;
  delete from public.notifications
   where campaign_id = p_campaign_id;
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.admin_send_notification(text, text, text, text, text, uuid[]) from public, anon;
grant execute on function public.admin_send_notification(text, text, text, text, text, uuid[]) to authenticated;

-- Coupon announcements are also admin-authored broadcasts and belong in the same history.
create or replace function public.notify_coupon_audience(
  p_coupon_id uuid,
  p_user_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon public.coupons%rowtype;
  v_campaign_id uuid := gen_random_uuid();
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to send coupon notifications';
  end if;

  select * into v_coupon
    from public.coupons
   where id = p_coupon_id;
  if not found then
    raise exception 'Coupon not found';
  end if;

  insert into public.notifications (user_id, kind, title, body, action_url, expires_at, campaign_id)
  select u.id,
         'coupon',
         'New offer: ' || upper(v_coupon.code),
         case
           when v_coupon.discount_type = 'PERCENTAGE' then
             'Save ' || trim(to_char(v_coupon.discount_value, 'FM999999990.##')) || '% on your next order with coupon ' || upper(v_coupon.code) || '.'
           else
             'Save ₹' || trim(to_char(v_coupon.discount_value, 'FM999999990.##')) || ' on your next order with coupon ' || upper(v_coupon.code) || '.'
         end,
         '/shop',
         least(v_coupon.expires_at, now() + interval '7 days'),
         v_campaign_id
    from auth.users u
   where (p_user_ids is null or u.id = any(p_user_ids))
     and u.id is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.notify_coupon_audience(uuid, uuid[]) from public, anon;
grant execute on function public.notify_coupon_audience(uuid, uuid[]) to authenticated;

revoke all on function public.admin_list_notification_campaigns() from public, anon;
grant execute on function public.admin_list_notification_campaigns() to authenticated;
revoke all on function public.admin_delete_notification_campaign(uuid) from public, anon;
grant execute on function public.admin_delete_notification_campaign(uuid) to authenticated;
