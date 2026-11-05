-- Split the admin activity feed into two surfaces:
--   1. Notifications (the bell): customer-initiated events only — new orders,
--      reviews, support requests, account registrations, coupon redemptions.
--   2. Activity log: everything the admin did themselves — order status and
--      payment changes, support status changes, admin replies, profile updates,
--      product/coupon edits and notification campaigns.
-- Admin actions must never ring the admin's own notification bell.

-- ---------------------------------------------------------------------------
-- 1. Feed RPC: expose actor_is_admin and accept a source filter.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_activity_feed(integer, timestamptz, uuid);

create function public.admin_list_activity_feed(
  p_limit integer default 200,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_source text default 'all'
)
returns table(
  id uuid,
  event_type text,
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  subject_user_id uuid,
  actor_is_admin boolean,
  actor_name text,
  actor_email text,
  customer_name text,
  customer_email text,
  customer_phone text,
  title text,
  body text,
  details jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor values must be provided together';
  end if;
  if coalesce(p_source, 'all') not in ('all', 'customer', 'admin') then
    raise exception 'Unsupported activity source';
  end if;
  return query
  with feed as (
    select
      e.id,e.event_type::text,e.entity_type::text,e.entity_id,e.actor_user_id,e.subject_user_id,
      -- Admin-authored events: the actor is an admin account, or a system/seed
      -- event that only the admin panel can produce (legacy anonymous reviews
      -- stay customer-side).
      (aa.user_id is not null or (e.actor_user_id is null and e.event_type <> 'review_created')) as actor_is_admin,
      coalesce(nullif(ap.full_name,''),nullif(aa.display_name,''),nullif(au.email,''),case when e.actor_user_id is null then 'System' else 'Customer' end)::text as actor_name,
      coalesce(au.email,'')::text as actor_email,
      coalesce(nullif(o.customer_name,''),nullif(sp.full_name,''),nullif(r.author_name,''),nullif(cp.full_name,''),nullif(p.name,''),nullif(c.code,''),'Account activity')::text as customer_name,
      coalesce(su.email,nullif(o.metadata ->> 'email',''),'')::text as customer_email,
      coalesce(nullif(o.customer_phone,''),nullif(sp.phone,''),nullif(cp.phone,''),'')::text as customer_phone,
      e.title::text as title,e.body::text as body,
      case
        when e.entity_type='order' and o.id is not null then e.details || jsonb_build_object(
          'order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,'total',o.total,'subtotal',o.subtotal,
          'discount',o.discount,'payment_method',o.payment_method,'vehicle_model',o.vehicle_model,'pickup_store',o.pickup_store,
          'pickup_note',o.pickup_note,'coupon_code',coalesce(o.coupon_code_snapshot,o.coupon_code),
          'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name,'color',i.color,'quantity',i.quantity,'unit_price',i.unit_price,'selected_thickness',i.selected_thickness,'selected_stitch',i.selected_stitch,'custom_embroidery_text',i.custom_embroidery_text) order by i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb))
        when e.entity_type='review' and r.id is not null then e.details || jsonb_build_object('product_name',rp.name,'rating',r.rating,'review_text',coalesce(r.review_text,r.body),'is_published',r.is_published,'verified_purchase',r.is_verified_purchase)
        when e.entity_type='support_request' and sr.id is not null then e.details || jsonb_build_object('category',sr.category,'subject',sr.subject,'message',sr.message,'status',sr.status,'request_id',sr.id,'related_order_id',sr.related_order_id,'order_number',related_order.order_number)
        when e.entity_type='customer' and cp.id is not null then e.details || jsonb_build_object('full_name',cp.full_name,'created_at',cp.created_at)
        when e.entity_type='product' and p.id is not null then e.details || jsonb_build_object('name',p.name,'price',p.price,'category',p.category,'is_active',p.is_active,'image_url',p.image_url)
        when e.entity_type='coupon' and c.id is not null then e.details || jsonb_build_object('code',c.code,'discount_type',c.discount_type,'discount_value',c.discount_value,'is_enabled',c.is_enabled)
        else e.details
      end::jsonb as details,
      e.created_at::timestamptz as created_at,reads.read_at::timestamptz as read_at
    from public.admin_activity_events e
    left join public.admin_activity_event_reads reads on reads.event_id=e.id and reads.admin_user_id=v_user
    left join public.orders o on e.entity_type='order' and o.id=e.entity_id
    left join public.orders related_order on e.entity_type='support_request' and related_order.id=(select request.related_order_id from public.customer_support_requests request where request.id=e.entity_id)
    left join public.reviews r on e.entity_type='review' and r.id=e.entity_id
    left join public.products rp on rp.id=r.product_id
    left join public.customer_support_requests sr on e.entity_type='support_request' and sr.id=e.entity_id
    left join public.profiles ap on ap.id=e.actor_user_id
    left join public.profiles cp on cp.id=e.subject_user_id
    left join public.profiles sp on e.entity_type='support_request' and sp.id=sr.user_id
    left join public.products p on e.entity_type='product' and p.id=e.entity_id
    left join public.coupons c on e.entity_type='coupon' and c.id=e.entity_id
    left join public.admin_users aa on aa.user_id=e.actor_user_id
    left join auth.users au on au.id=e.actor_user_id
    left join auth.users su on su.id=e.subject_user_id
    where p_before_created_at is null or (e.created_at,e.id)<(p_before_created_at,p_before_id)
  )
  select
    feed.id,feed.event_type,feed.entity_type,feed.entity_id,feed.actor_user_id,feed.subject_user_id,
    feed.actor_is_admin,feed.actor_name,feed.actor_email,feed.customer_name,feed.customer_email,
    feed.customer_phone,feed.title,feed.body,feed.details,feed.created_at,feed.read_at
  from feed
  where coalesce(p_source,'all') = 'all'
     or (coalesce(p_source,'all') = 'admin' and feed.actor_is_admin)
     or (coalesce(p_source,'all') = 'customer' and not feed.actor_is_admin)
  order by feed.created_at desc,feed.id desc
  limit greatest(1,least(coalesce(p_limit,200),200));
end;
$$;
revoke all on function public.admin_list_activity_feed(integer,timestamptz,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_list_activity_feed(integer,timestamptz,uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Bell badge: only customer-initiated events are unread notifications.
-- ---------------------------------------------------------------------------
create or replace function public.admin_unread_activity_count()
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_count bigint;
begin
  if v_user is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  select count(*) into v_count
    from public.admin_activity_events e
    left join public.admin_users aa on aa.user_id = e.actor_user_id
   where not exists (select 1 from public.admin_activity_event_reads r where r.event_id=e.id and r.admin_user_id=v_user)
     and not (aa.user_id is not null or (e.actor_user_id is null and e.event_type <> 'review_created'));
  return coalesce(v_count,0);
end $$;
revoke all on function public.admin_unread_activity_count() from public, anon, authenticated;
grant execute on function public.admin_unread_activity_count() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Mark-all-read honours the surface it was triggered from.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_mark_all_activity_read();

create or replace function public.admin_mark_all_activity_read(p_source text default 'all')
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if coalesce(p_source,'all') not in ('all','customer','admin') then raise exception 'Unsupported activity source'; end if;
  insert into public.admin_activity_event_reads(event_id,admin_user_id,read_at)
  select e.id,v_user,now()
    from public.admin_activity_events e
    left join public.admin_users aa on aa.user_id = e.actor_user_id
   where not (coalesce(p_source,'all') = 'customer' and (aa.user_id is not null or (e.actor_user_id is null and e.event_type <> 'review_created')))
     and not (coalesce(p_source,'all') = 'admin' and not (aa.user_id is not null or (e.actor_user_id is null and e.event_type <> 'review_created')))
  on conflict (event_id,admin_user_id) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end $$;
revoke all on function public.admin_mark_all_activity_read(text) from public, anon, authenticated;
grant execute on function public.admin_mark_all_activity_read(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Admin broadcasts must never land in admin inboxes. "All customers" used to
--    insert a row for every auth.users account, including admin accounts, so
--    admins received copies of their own campaigns.
-- ---------------------------------------------------------------------------
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
    if exists (
      select 1
        from public.admin_users as admins
       where admins.user_id = any(p_user_ids)
    ) then
      raise exception 'Administrator accounts cannot receive customer notifications';
    end if;
  end if;
  insert into public.notifications (user_id, kind, title, body, action_url, image_url, campaign_id)
  select users.id, v_kind, v_title, v_body, v_action_url, v_image_url, v_campaign_id
    from auth.users as users
   where (p_user_ids is null or users.id = any(p_user_ids))
     and not exists (select 1 from public.admin_users as admins where admins.user_id = users.id);
  get diagnostics v_sent_count = row_count;
  return v_sent_count;
end;
$$;

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
     and u.id is not null
     and not exists (select 1 from public.admin_users as admins where admins.user_id = u.id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_send_notification(text, text, text, text, text, uuid[]) from public, anon;
grant execute on function public.admin_send_notification(text, text, text, text, text, uuid[]) to authenticated;
revoke all on function public.notify_coupon_audience(uuid, uuid[]) from public, anon;
grant execute on function public.notify_coupon_audience(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Customer notes: block admin accounts as targets so an admin can never
--    notify themselves (or another admin) through the customer profile.
-- ---------------------------------------------------------------------------
create or replace function public.admin_add_customer_note_and_notify(
  p_customer_id uuid,
  p_note_id text,
  p_category text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note_id text := btrim(coalesce(p_note_id, ''));
  v_category text := btrim(coalesce(p_category, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_settings jsonb;
  v_customer_notes jsonb;
  v_existing_note jsonb;
  v_note jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required to add customer notes';
  end if;

  if p_customer_id is null or not exists (select 1 from auth.users where id = p_customer_id) then
    raise exception 'The selected customer account no longer exists';
  end if;
  if exists (select 1 from public.admin_users where user_id = p_customer_id) then
    raise exception 'Administrator accounts cannot receive customer notes';
  end if;
  if v_note_id = '' or char_length(v_note_id) > 100 then
    raise exception 'A valid note ID is required';
  end if;
  if v_category not in ('Important', 'Delivery', 'Payment', 'Call', 'General') then
    raise exception 'Unsupported customer note category';
  end if;
  if v_content = '' or char_length(v_content) > 500 then
    raise exception 'Customer note must contain 1 to 500 characters';
  end if;

  -- Serialize appends so concurrent administrators cannot overwrite each other's notes.
  perform pg_advisory_xact_lock(hashtext('admin_customer_notes'), 1);
  select value
    into v_settings
    from public.app_settings
   where key = 'admin_customer_notes'
   for update;
  if not found then
    v_settings := '{}'::jsonb;
  elsif jsonb_typeof(v_settings) is distinct from 'object' then
    raise exception 'Customer note storage has an invalid format';
  end if;

  if jsonb_typeof(v_settings -> p_customer_id::text) = 'array' then
    select existing_note.value
      into v_existing_note
      from jsonb_array_elements(v_settings -> p_customer_id::text) as existing_note(value)
     where existing_note.value ->> 'id' = v_note_id
     limit 1;
    if found then
      return v_existing_note;
    end if;
  end if;

  if jsonb_typeof(v_settings -> p_customer_id::text) = 'array' then
    v_customer_notes := v_settings -> p_customer_id::text;
  else
    v_customer_notes := '[]'::jsonb;
  end if;

  v_now := clock_timestamp();
  v_note := jsonb_build_object(
    'id', v_note_id,
    'category', v_category,
    'content', v_content,
    'createdAt', v_now,
    'author', 'Admin',
    'customerNotifiedAt', v_now
  );
  v_settings := jsonb_set(
    v_settings,
    array[p_customer_id::text],
    v_customer_notes || jsonb_build_array(v_note),
    true
  );

  insert into public.app_settings (key, value, updated_by, updated_at)
  values ('admin_customer_notes', v_settings, auth.uid(), v_now)
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.notifications (user_id, kind, title, body, action_url)
  values (
    p_customer_id,
    'update',
    'Note from Rofik Godi Centre',
    v_content,
    '/notifications'
  );

  return v_note;
end;
$$;

revoke all on function public.admin_add_customer_note_and_notify(uuid, text, text, text) from public, anon;
grant execute on function public.admin_add_customer_note_and_notify(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Customer picker: admin accounts are not customers. This keeps them out of
--    the audience picker, the customers table and every customer-targeted flow.
-- ---------------------------------------------------------------------------
create or replace function public.admin_customer_summary()
returns table (id uuid, name text, email text, phone text, order_count bigint, total_spent numeric, last_order timestamptz, created_at timestamptz, status text)
language sql security definer set search_path = public
as $$
  select p.id, coalesce(nullif(p.full_name, ''), 'Customer'), coalesce(u.email, ''), coalesce(p.phone, ''),
    count(o.id), coalesce(sum(o.total), 0), max(o.created_at), p.created_at,
    case when bool_or(o.status = 'COMPLETED') then 'Returning' when count(o.id) > 0 then 'Active' else 'New' end
  from public.profiles p join auth.users u on u.id = p.id left join public.orders o on o.user_id = p.id
  where public.is_admin()
    and not exists (select 1 from public.admin_users a where a.user_id = p.id)
  group by p.id, p.full_name, u.email, p.phone, p.created_at order by p.created_at desc;
$$;
revoke all on function public.admin_customer_summary() from public, anon;
grant execute on function public.admin_customer_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. One-time cleanup: remove campaign copies already sitting in admin inboxes.
--    Real customer recipients and all support/order admin alerts are untouched.
-- ---------------------------------------------------------------------------
delete from public.notifications as stale
 where stale.campaign_id is not null
   and exists (select 1 from public.admin_users a where a.user_id = stale.user_id);
