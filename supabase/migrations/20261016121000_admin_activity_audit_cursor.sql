-- Cursor pagination and audit history for product, profile, coupon and campaign activity.

alter table public.admin_activity_events
  drop constraint if exists admin_activity_events_event_type_check,
  drop constraint if exists admin_activity_events_entity_type_check;

alter table public.admin_activity_events
  add constraint admin_activity_events_event_type_check
    check (event_type in (
      'order_created','order_status_changed','order_payment_changed',
      'review_created','customer_registered','customer_profile_updated',
      'support_request_created','support_request_status_changed',
      'support_request_message_received','support_reply_sent',
      'coupon_redeemed','product_created','product_updated','product_deleted',
      'coupon_created','coupon_updated','coupon_deleted','notification_campaign_sent'
    )),
  add constraint admin_activity_events_entity_type_check
    check (entity_type in ('order','review','customer','support_request','product','coupon','campaign'));

create index if not exists admin_activity_events_cursor_idx
  on public.admin_activity_events (created_at desc, id desc);

create or replace function public.log_admin_product_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_name text;
  v_event_type text;
  v_title text;
  v_action text;
  v_key text;
  v_fields text[] := array[]::text[];
  v_old jsonb;
  v_new jsonb;
  v_details jsonb;
  v_created_at timestamptz := now();
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
    v_old := to_jsonb(old);
    v_name := coalesce(v_old ->> 'name', 'Product');
    v_event_type := 'product_deleted';
    v_title := 'Product removed';
    v_action := 'removed';
    v_key := 'product-deleted:' || v_id::text || ':' || txid_current()::text;
    v_details := jsonb_build_object('name',v_name,'price',v_old -> 'price','category',v_old -> 'category');
  elsif tg_op = 'INSERT' then
    v_id := new.id;
    v_new := to_jsonb(new);
    v_name := coalesce(v_new ->> 'name', 'Product');
    v_event_type := 'product_created';
    v_title := 'Product added';
    v_action := 'added';
    v_key := 'product-created:' || v_id::text;
    v_details := jsonb_build_object('name',v_name,'price',v_new -> 'price','category',v_new -> 'category','is_active',v_new -> 'is_active');
    v_created_at := coalesce((v_new ->> 'created_at')::timestamptz, now());
  else
    v_id := new.id;
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), array[]::text[])
      into v_fields
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key = any(array[
        'name','description','price','original_price','category','is_active','image_url',
        'additional_images','colors','colors_json','compatibility','compatibility_list','badge','badge_color',
        'is_bestseller','is_new','features','materials','stitch_patterns','thickness_options',
        'is_customizable','is_waterproof','in_stock'
      ]::text[]);
    if cardinality(v_fields) = 0 then return new; end if;
    v_name := coalesce(v_new ->> 'name', 'Product');
    v_event_type := 'product_updated';
    v_title := 'Product updated';
    v_action := 'updated';
    v_key := 'product-updated:' || v_id::text || ':' || txid_current()::text || ':' || clock_timestamp()::text;
    v_details := jsonb_build_object('name',v_name,'price',v_new -> 'price','category',v_new -> 'category','is_active',v_new -> 'is_active','changed_fields',to_jsonb(v_fields));
  end if;

  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
  values (v_key,v_event_type,'product',v_id,auth.uid(),v_title,format('Product "%s" was %s.',v_name,v_action),v_details,v_created_at)
  on conflict (event_key) do nothing;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.log_admin_product_activity() from public, anon, authenticated;
drop trigger if exists products_log_admin_activity on public.products;
create trigger products_log_admin_activity
  after insert or update or delete on public.products
  for each row execute function public.log_admin_product_activity();

create or replace function public.log_admin_coupon_config_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_code text;
  v_event_type text;
  v_title text;
  v_action text;
  v_key text;
  v_fields text[] := array[]::text[];
  v_old jsonb;
  v_new jsonb;
  v_details jsonb;
  v_created_at timestamptz := now();
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
    v_old := to_jsonb(old);
    v_code := coalesce(v_old ->> 'code','coupon');
    v_event_type := 'coupon_deleted';
    v_title := 'Coupon removed';
    v_action := 'removed';
    v_key := 'coupon-deleted:' || v_id::text || ':' || txid_current()::text;
    v_details := jsonb_build_object('code',v_code,'discount_type',v_old -> 'discount_type','discount_value',v_old -> 'discount_value');
  elsif tg_op = 'INSERT' then
    v_id := new.id;
    v_new := to_jsonb(new);
    v_code := coalesce(v_new ->> 'code','coupon');
    v_event_type := 'coupon_created';
    v_title := 'Coupon created';
    v_action := 'created';
    v_key := 'coupon-created:' || v_id::text;
    v_details := jsonb_build_object('code',v_code,'discount_type',v_new -> 'discount_type','discount_value',v_new -> 'discount_value','is_enabled',v_new -> 'is_enabled');
    v_created_at := coalesce((v_new ->> 'created_at')::timestamptz, now());
  else
    v_id := new.id;
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), array[]::text[])
      into v_fields
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key = any(array[
        'code','description','discount_type','discount_value','max_discount','minimum_order_value',
        'starts_at','expires_at','usage_limit','per_customer_limit','eligibility','apply_to','is_enabled'
      ]::text[]);
    if cardinality(v_fields) = 0 then return new; end if;
    v_code := coalesce(v_new ->> 'code','coupon');
    v_event_type := 'coupon_updated';
    v_title := 'Coupon updated';
    v_action := 'updated';
    v_key := 'coupon-updated:' || v_id::text || ':' || txid_current()::text || ':' || clock_timestamp()::text;
    v_details := jsonb_build_object('code',v_code,'discount_type',v_new -> 'discount_type','discount_value',v_new -> 'discount_value','is_enabled',v_new -> 'is_enabled','changed_fields',to_jsonb(v_fields));
  end if;

  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
  values (v_key,v_event_type,'coupon',v_id,auth.uid(),v_title,format('Coupon "%s" was %s.',v_code,v_action),v_details,v_created_at)
  on conflict (event_key) do nothing;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.log_admin_coupon_config_activity() from public, anon, authenticated;
drop trigger if exists coupons_log_admin_activity on public.coupons;
create trigger coupons_log_admin_activity
  after insert or update or delete on public.coupons
  for each row execute function public.log_admin_coupon_config_activity();

create or replace function public.log_customer_profile_update_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_actor_id uuid := auth.uid();
  v_fields text[];
  v_name text;
  v_body text;
begin
  select coalesce(array_agg(n.key order by n.key),array[]::text[])
    into v_fields
  from jsonb_each(v_new) n
  join jsonb_each(v_old) o on o.key=n.key
  where n.value is distinct from o.value
    and n.key = any(array['full_name','phone','avatar_url','vehicle_model','marketing_opt_in']::text[]);
  if cardinality(v_fields)=0 then return new; end if;
  v_name := coalesce(nullif(new.full_name,''),'A customer');
  v_body := case
    when v_actor_id = new.id then format('%s updated account details.',v_name)
    when v_actor_id is null then format('Account details for %s were updated.',v_name)
    else format('An administrator updated %s''s account details.',v_name)
  end;
  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
  values (
    'customer-profile-updated:'||new.id::text||':'||txid_current()::text||':'||clock_timestamp()::text,
    'customer_profile_updated','customer',new.id,v_actor_id,new.id,'Customer profile updated',
    v_body,
    jsonb_build_object('changed_fields',to_jsonb(v_fields))
  ) on conflict (event_key) do nothing;
  return new;
end;
$$;
revoke all on function public.log_customer_profile_update_activity() from public, anon, authenticated;
drop trigger if exists profiles_log_update_activity on public.profiles;
create trigger profiles_log_update_activity
  after update on public.profiles
  for each row execute function public.log_customer_profile_update_activity();

-- A statement-level transition table groups all recipients into one campaign audit event.
create or replace function public.log_admin_campaign_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign record;
begin
  if auth.uid() is null or not public.is_admin() then return null; end if;
  for v_campaign in
    select campaign_id,count(*)::integer as recipient_count,
      min(title)::text as title,min(body)::text as body,min(created_at) as created_at
    from new_notifications
    where campaign_id is not null
    group by campaign_id
  loop
    insert into public.admin_activity_events as activity(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
    values (
      'notification-campaign-sent:'||v_campaign.campaign_id::text,
      'notification_campaign_sent','campaign',v_campaign.campaign_id,auth.uid(),
      'Customer notification campaign sent',coalesce(v_campaign.title,'A notification campaign was sent.'),
      jsonb_build_object('campaign_id',v_campaign.campaign_id,'campaign_title',v_campaign.title,'campaign_body',left(coalesce(v_campaign.body,''),200),'recipient_count',v_campaign.recipient_count),
      v_campaign.created_at
    )
    on conflict (event_key) do update set
      details = activity.details || jsonb_build_object(
        'recipient_count',coalesce((activity.details->>'recipient_count')::integer,0)+coalesce((excluded.details->>'recipient_count')::integer,0)
      );
  end loop;
  return null;
end;
$$;
revoke all on function public.log_admin_campaign_activity() from public, anon, authenticated;
drop trigger if exists notifications_log_campaign_activity on public.notifications;
create trigger notifications_log_campaign_activity
  after insert on public.notifications
  referencing new table as new_notifications
  for each statement execute function public.log_admin_campaign_activity();

-- Seed current real catalog/campaign records without inventing customer activity.
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
select 'product-created:'||p.id::text,'product_created','product',p.id,null,'Product added',format('Product "%s" is in the catalog.',p.name),
  jsonb_build_object('name',p.name,'price',p.price,'category',p.category,'is_active',p.is_active),coalesce(p.created_at,now())
from public.products p
on conflict (event_key) do nothing;

insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
select 'coupon-created:'||c.id::text,'coupon_created','coupon',c.id,null,'Coupon created',format('Coupon "%s" is configured.',c.code),
  jsonb_build_object('code',c.code,'discount_type',c.discount_type,'discount_value',c.discount_value,'is_enabled',c.is_enabled),coalesce(c.created_at,now())
from public.coupons c
on conflict (event_key) do nothing;

insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,title,body,details,created_at)
select 'notification-campaign-sent:'||n.campaign_id::text,'notification_campaign_sent','campaign',n.campaign_id,null,
  'Customer notification campaign sent',min(n.title),
  jsonb_build_object('campaign_id',n.campaign_id,'campaign_title',min(n.title),'campaign_body',left(min(n.body),200),'recipient_count',count(*)),min(n.created_at)
from public.notifications n
where n.campaign_id is not null
group by n.campaign_id
on conflict (event_key) do nothing;

-- Replace the one-page RPC with a stable `(created_at,id)` keyset cursor.
drop function if exists public.admin_list_activity_feed(integer);
create function public.admin_list_activity_feed(
  p_limit integer default 200,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table(
  id uuid,
  event_type text,
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  subject_user_id uuid,
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
  return query
  select
    e.id,e.event_type::text,e.entity_type::text,e.entity_id,e.actor_user_id,e.subject_user_id,
    coalesce(nullif(ap.full_name,''),nullif(aa.display_name,''),nullif(au.email,''),case when e.actor_user_id is null then 'System' else 'Customer' end)::text,
    coalesce(au.email,'')::text,
    coalesce(nullif(o.customer_name,''),nullif(sp.full_name,''),nullif(r.author_name,''),nullif(cp.full_name,''),nullif(p.name,''),nullif(c.code,''),'Account activity')::text,
    coalesce(su.email,nullif(o.metadata ->> 'email',''),'')::text,
    coalesce(nullif(o.customer_phone,''),nullif(sp.phone,''),nullif(cp.phone,''),'')::text,
    e.title::text,e.body::text,
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
    end::jsonb,
    e.created_at::timestamptz,reads.read_at::timestamptz
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
  order by e.created_at desc,e.id desc
  limit greatest(1,least(coalesce(p_limit,200),200));
end;
$$;
revoke all on function public.admin_list_activity_feed(integer,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.admin_list_activity_feed(integer,timestamptz,uuid) to authenticated;
