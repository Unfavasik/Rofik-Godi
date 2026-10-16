-- Secure customer-support intake and admin activity inbox.

create table if not exists public.customer_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Order issue','Product question','Payment','Pickup / installation','Other')),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_support_requests_created_idx on public.customer_support_requests (created_at desc);
alter table public.customer_support_requests enable row level security;
drop policy if exists customer_support_requests_own_read on public.customer_support_requests;
drop policy if exists customer_support_requests_admin_read on public.customer_support_requests;
create policy customer_support_requests_own_read on public.customer_support_requests for select to authenticated using (user_id = auth.uid());
create policy customer_support_requests_admin_read on public.customer_support_requests for select to authenticated using (public.is_admin());
revoke all on public.customer_support_requests from public, anon, authenticated;
grant select on public.customer_support_requests to authenticated;

create table if not exists public.admin_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type in ('order_created','order_status_changed','order_payment_changed','review_created','customer_registered','support_request_created','support_request_status_changed','coupon_redeemed')),
  entity_type text not null check (entity_type in ('order','review','customer','support_request')),
  entity_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_events_created_idx on public.admin_activity_events (created_at desc, id desc);
create index if not exists admin_activity_events_entity_idx on public.admin_activity_events (entity_type, entity_id, created_at desc);
alter table public.admin_activity_events enable row level security;
drop policy if exists admin_activity_events_admin_read on public.admin_activity_events;
create policy admin_activity_events_admin_read on public.admin_activity_events for select to authenticated using (public.is_admin());
revoke all on public.admin_activity_events from public, anon, authenticated;
grant select on public.admin_activity_events to authenticated;

create table if not exists public.admin_activity_event_reads (
  event_id uuid not null references public.admin_activity_events(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (event_id, admin_user_id)
);
alter table public.admin_activity_event_reads enable row level security;
drop policy if exists admin_activity_event_reads_admin_read on public.admin_activity_event_reads;
create policy admin_activity_event_reads_admin_read on public.admin_activity_event_reads for select to authenticated using (admin_user_id = auth.uid() and public.is_admin());
revoke all on public.admin_activity_event_reads from public, anon, authenticated;
grant select on public.admin_activity_event_reads to authenticated;

create or replace function public.create_customer_support_request(p_category text, p_subject text, p_message text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_category text := nullif(btrim(p_category), '');
  v_subject text := nullif(btrim(p_subject), '');
  v_message text := nullif(btrim(p_message), '');
  v_id uuid;
begin
  if v_user is null then raise exception 'Sign in to submit a support request'; end if;
  if v_category is null or v_category not in ('Order issue','Product question','Payment','Pickup / installation','Other') then raise exception 'Choose a valid support category'; end if;
  if v_subject is null or char_length(v_subject) not between 3 and 120 then raise exception 'Subject must be between 3 and 120 characters'; end if;
  if v_message is null or char_length(v_message) not between 10 and 2000 then raise exception 'Message must be between 10 and 2,000 characters'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'Customer profile is not available'; end if;
  insert into public.customer_support_requests(user_id,category,subject,message) values (v_user,v_category,v_subject,v_message) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_customer_support_request(text,text,text) from public, anon, authenticated;
grant execute on function public.create_customer_support_request(text,text,text) to authenticated;

create or replace function public.log_admin_order_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
    values ('order-created:'||new.id,'order_created','order',new.id,new.user_id,new.user_id,'New order placed',format('Order #%s was placed by %s.',new.order_number,coalesce(nullif(new.customer_name,''),'a customer')),
      jsonb_build_object('order_number',new.order_number,'status',new.status,'payment_status',new.payment_status,'total',new.total,'payment_method',new.payment_method),new.created_at)
    on conflict (event_key) do nothing;
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
    values (format('order-status:%s:%s:%s:%s',new.id,old.status,new.status,transaction_timestamp()),'order_status_changed','order',new.id,auth.uid(),new.user_id,'Order status updated',format('Order #%s changed from %s to %s.',new.order_number,old.status,new.status),
      jsonb_build_object('order_number',new.order_number,'old_status',old.status,'status',new.status,'payment_status',new.payment_status,'total',new.total)) on conflict (event_key) do nothing;
  end if;
  if old.payment_status is distinct from new.payment_status then
    insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
    values (format('order-payment:%s:%s:%s:%s',new.id,old.payment_status,new.payment_status,transaction_timestamp()),'order_payment_changed','order',new.id,auth.uid(),new.user_id,'Order payment updated',format('Payment for order #%s changed from %s to %s.',new.order_number,old.payment_status,new.payment_status),
      jsonb_build_object('order_number',new.order_number,'old_payment_status',old.payment_status,'payment_status',new.payment_status,'status',new.status,'total',new.total)) on conflict (event_key) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.log_admin_order_activity() from public, anon, authenticated;
drop trigger if exists orders_log_admin_activity_insert on public.orders;
create trigger orders_log_admin_activity_insert after insert on public.orders for each row execute function public.log_admin_order_activity();
drop trigger if exists orders_log_admin_activity_update on public.orders;
create trigger orders_log_admin_activity_update after update of status,payment_status on public.orders for each row when (old.status is distinct from new.status or old.payment_status is distinct from new.payment_status) execute function public.log_admin_order_activity();

create or replace function public.log_admin_review_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
  values ('review-created:'||new.id,'review_created','review',new.id,coalesce(new.user_id,new.customer_id),coalesce(new.customer_id,new.user_id),'New product review',format('%s left a %s-star product review.',new.author_name,new.rating),
    jsonb_build_object('product_id',new.product_id,'rating',new.rating,'review_text',coalesce(new.review_text,new.body),'is_published',new.is_published,'verified_purchase',new.is_verified_purchase),new.created_at)
  on conflict (event_key) do nothing;
  return new;
end $$;
revoke all on function public.log_admin_review_activity() from public, anon, authenticated;
drop trigger if exists reviews_log_admin_activity on public.reviews;
create trigger reviews_log_admin_activity after insert on public.reviews for each row execute function public.log_admin_review_activity();

create or replace function public.log_admin_customer_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.admin_users where user_id = new.id) then return new; end if;
  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
  values ('customer-created:'||new.id,'customer_registered','customer',new.id,new.id,new.id,'New customer account',format('%s created a customer account.',coalesce(nullif(new.full_name,''),'A customer')),jsonb_build_object('full_name',coalesce(new.full_name,'Customer')),new.created_at)
  on conflict (event_key) do nothing;
  return new;
end $$;
revoke all on function public.log_admin_customer_activity() from public, anon, authenticated;
drop trigger if exists profiles_log_admin_activity on public.profiles;
create trigger profiles_log_admin_activity after insert on public.profiles for each row execute function public.log_admin_customer_activity();

create or replace function public.log_admin_support_request_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
    values ('support-created:'||new.id,'support_request_created','support_request',new.id,new.user_id,new.user_id,'New customer support request',format('%s submitted a %s support request.',coalesce((select full_name from public.profiles where id=new.user_id),'A customer'),new.category),jsonb_build_object('category',new.category,'subject',new.subject,'status',new.status),new.created_at)
    on conflict (event_key) do nothing;
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
    values (format('support-status:%s:%s:%s:%s',new.id,old.status,new.status,transaction_timestamp()),'support_request_status_changed','support_request',new.id,auth.uid(),new.user_id,'Support request status updated',format('Support request "%s" changed from %s to %s.',new.subject,old.status,new.status),jsonb_build_object('category',new.category,'subject',new.subject,'old_status',old.status,'status',new.status))
    on conflict (event_key) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.log_admin_support_request_activity() from public, anon, authenticated;
drop trigger if exists support_requests_log_admin_activity_insert on public.customer_support_requests;
create trigger support_requests_log_admin_activity_insert after insert on public.customer_support_requests for each row execute function public.log_admin_support_request_activity();
drop trigger if exists support_requests_log_admin_activity_update on public.customer_support_requests;
create trigger support_requests_log_admin_activity_update after update of status on public.customer_support_requests for each row when (old.status is distinct from new.status) execute function public.log_admin_support_request_activity();

create or replace function public.log_admin_coupon_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
  values ('coupon-usage:'||new.id,'coupon_redeemed','order',new.order_id,new.customer_id,new.customer_id,'Coupon redeemed',format('A customer used a coupon on order %s.',new.order_id),jsonb_build_object('coupon_id',new.coupon_id,'discount_amount',new.discount_amount),new.created_at)
  on conflict (event_key) do nothing;
  return new;
end $$;
revoke all on function public.log_admin_coupon_activity() from public, anon, authenticated;
drop trigger if exists coupon_usages_log_admin_activity on public.coupon_usages;
create trigger coupon_usages_log_admin_activity after insert on public.coupon_usages for each row execute function public.log_admin_coupon_activity();

-- Backfill recent real events so the inbox is useful immediately; no customer notification is sent.
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
select 'order-created:'||o.id,'order_created','order',o.id,o.user_id,o.user_id,'New order placed',format('Order #%s was placed by %s.',o.order_number,coalesce(nullif(o.customer_name,''),'a customer')),
  jsonb_build_object('order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,'total',o.total,'payment_method',o.payment_method),o.created_at
from (select * from public.orders order by created_at desc limit 200) o on conflict (event_key) do nothing;
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
select 'order-status-history:'||h.id,'order_status_changed','order',o.id,h.changed_by,o.user_id,'Order status updated',format('Order #%s changed to %s.',o.order_number,h.to_status),jsonb_build_object('order_number',o.order_number,'old_status',h.from_status,'status',h.to_status,'note',h.note),h.created_at
from (select * from public.order_status_history order by created_at desc limit 200) h join public.orders o on o.id=h.order_id on conflict (event_key) do nothing;
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
select 'review-created:'||r.id,'review_created','review',r.id,coalesce(r.user_id,r.customer_id),coalesce(r.customer_id,r.user_id),'New product review',format('%s left a %s-star product review.',r.author_name,r.rating),jsonb_build_object('product_id',r.product_id,'rating',r.rating,'review_text',coalesce(r.review_text,r.body),'is_published',r.is_published,'verified_purchase',r.is_verified_purchase),r.created_at
from (select * from public.reviews order by created_at desc limit 200) r on conflict (event_key) do nothing;
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
select 'customer-created:'||p.id,'customer_registered','customer',p.id,p.id,p.id,'New customer account',format('%s created a customer account.',coalesce(nullif(p.full_name,''),'A customer')),jsonb_build_object('full_name',coalesce(p.full_name,'Customer')),p.created_at
from (select p.* from public.profiles p where not exists (select 1 from public.admin_users a where a.user_id=p.id) order by p.created_at desc limit 200) p on conflict (event_key) do nothing;
insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details,created_at)
select 'coupon-usage:'||c.id,'coupon_redeemed','order',c.order_id,c.customer_id,c.customer_id,'Coupon redeemed',format('A customer used a coupon on order %s.',c.order_id),jsonb_build_object('coupon_id',c.coupon_id,'discount_amount',c.discount_amount),c.created_at
from (select * from public.coupon_usages order by created_at desc limit 200) c on conflict (event_key) do nothing;
insert into public.admin_activity_event_reads(event_id,admin_user_id,read_at)
select e.id,a.user_id,now() from public.admin_activity_events e cross join public.admin_users a on conflict (event_id,admin_user_id) do nothing;

create or replace function public.admin_list_activity_feed(p_limit integer default 100)
returns table(id uuid,event_type text,entity_type text,entity_id uuid,actor_user_id uuid,subject_user_id uuid,actor_name text,actor_email text,customer_name text,customer_email text,customer_phone text,title text,body text,details jsonb,created_at timestamptz,read_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  return query
  select e.id,e.event_type,e.entity_type,e.entity_id,e.actor_user_id,e.subject_user_id,
    coalesce(nullif(ap.full_name,''),nullif(aa.display_name,''),nullif(au.email,''),case when e.actor_user_id is null then 'System' else 'Customer' end),coalesce(au.email,''),
    coalesce(nullif(o.customer_name,''),nullif(sp.full_name,''),nullif(r.author_name,''),nullif(cp.full_name,''),'Customer'),
    coalesce(su.email,nullif(o.metadata->>'email',''),''),coalesce(nullif(o.customer_phone,''),nullif(sp.phone,''),nullif(cp.phone,''),''),e.title,e.body,
    case
      when e.entity_type='order' and o.id is not null then e.details||jsonb_build_object('order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,'total',o.total,'subtotal',o.subtotal,'discount',o.discount,'payment_method',o.payment_method,'vehicle_model',o.vehicle_model,'pickup_store',o.pickup_store,'pickup_note',o.pickup_note,'coupon_code',coalesce(o.coupon_code_snapshot,o.coupon_code),'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name,'color',i.color,'quantity',i.quantity,'unit_price',i.unit_price,'selected_thickness',i.selected_thickness,'selected_stitch',i.selected_stitch,'custom_embroidery_text',i.custom_embroidery_text) order by i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb))
      when e.entity_type='review' and r.id is not null then e.details||jsonb_build_object('product_name',pr.name,'rating',r.rating,'review_text',coalesce(r.review_text,r.body),'is_published',r.is_published,'verified_purchase',r.is_verified_purchase)
      when e.entity_type='support_request' and sr.id is not null then e.details||jsonb_build_object('category',sr.category,'subject',sr.subject,'message',sr.message,'status',sr.status,'request_id',sr.id)
      when e.entity_type='customer' and cp.id is not null then e.details||jsonb_build_object('full_name',cp.full_name,'created_at',cp.created_at)
      else e.details end,
    e.created_at,reads.read_at
  from public.admin_activity_events e
  left join public.admin_activity_event_reads reads on reads.event_id=e.id and reads.admin_user_id=v_user
  left join public.orders o on e.entity_type='order' and o.id=e.entity_id
  left join public.reviews r on e.entity_type='review' and r.id=e.entity_id
  left join public.products pr on pr.id=r.product_id
  left join public.customer_support_requests sr on e.entity_type='support_request' and sr.id=e.entity_id
  left join public.profiles ap on ap.id=e.actor_user_id
  left join public.profiles cp on cp.id=e.subject_user_id
  left join public.profiles sp on e.entity_type='support_request' and sp.id=sr.user_id
  left join public.admin_users aa on aa.user_id=e.actor_user_id
  left join auth.users au on au.id=e.actor_user_id
  left join auth.users su on su.id=e.subject_user_id
  order by e.created_at desc,e.id desc limit greatest(1,least(coalesce(p_limit,100),200));
end $$;
revoke all on function public.admin_list_activity_feed(integer) from public, anon, authenticated;
grant execute on function public.admin_list_activity_feed(integer) to authenticated;

create or replace function public.admin_unread_activity_count()
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_count bigint;
begin
  if v_user is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  select count(*) into v_count from public.admin_activity_events e where not exists (select 1 from public.admin_activity_event_reads r where r.event_id=e.id and r.admin_user_id=v_user);
  return coalesce(v_count,0);
end $$;
revoke all on function public.admin_unread_activity_count() from public, anon, authenticated;
grant execute on function public.admin_unread_activity_count() to authenticated;

create or replace function public.admin_mark_activity_read(p_event_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  insert into public.admin_activity_event_reads(event_id,admin_user_id,read_at) select e.id,auth.uid(),now() from public.admin_activity_events e where e.id=p_event_id on conflict (event_id,admin_user_id) do nothing;
  return exists (select 1 from public.admin_activity_event_reads r where r.event_id=p_event_id and r.admin_user_id=auth.uid());
end $$;
revoke all on function public.admin_mark_activity_read(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_activity_read(uuid) to authenticated;

create or replace function public.admin_mark_all_activity_read()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  insert into public.admin_activity_event_reads(event_id,admin_user_id,read_at) select e.id,v_user,now() from public.admin_activity_events e on conflict (event_id,admin_user_id) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end $$;
revoke all on function public.admin_mark_all_activity_read() from public, anon, authenticated;
grant execute on function public.admin_mark_all_activity_read() to authenticated;

create or replace function public.admin_update_customer_support_status(p_request_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_request public.customer_support_requests%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if p_status not in ('open','in_progress','resolved') then raise exception 'Choose a valid support status'; end if;
  update public.customer_support_requests set status=p_status,updated_at=now() where id=p_request_id returning * into v_request;
  if not found then raise exception 'Support request was not found'; end if;
  return jsonb_build_object('id',v_request.id,'status',v_request.status,'updated_at',v_request.updated_at);
end $$;
revoke all on function public.admin_update_customer_support_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_customer_support_status(uuid,text) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='admin_activity_events') then
    alter publication supabase_realtime add table public.admin_activity_events;
  end if;
end $$;
