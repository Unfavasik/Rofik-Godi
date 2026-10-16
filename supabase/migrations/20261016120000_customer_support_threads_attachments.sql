-- Expand private customer support requests into tracked, threaded conversations.

alter table public.customer_support_requests
  add column if not exists related_order_id uuid references public.orders(id) on delete set null,
  add column if not exists last_message_at timestamptz not null default now();

update public.customer_support_requests
set last_message_at = coalesce(updated_at, created_at)
where last_message_at is null;

create index if not exists customer_support_requests_owner_last_message_idx
  on public.customer_support_requests (user_id, last_message_at desc, id desc);

create table if not exists public.customer_support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_support_requests(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  sender_role text not null check (sender_role in ('customer', 'admin')),
  message text,
  attachments jsonb not null default '[]'::jsonb,
  is_initial boolean not null default false,
  created_at timestamptz not null default now(),
  constraint customer_support_messages_attachments_array check (jsonb_typeof(attachments) = 'array'),
  constraint customer_support_messages_content check (
    (message is not null and char_length(btrim(message)) between 1 and 2000)
    or jsonb_array_length(attachments) > 0
  )
);
create unique index if not exists customer_support_messages_one_initial_idx
  on public.customer_support_messages(request_id) where is_initial;
create index if not exists customer_support_messages_thread_idx
  on public.customer_support_messages(request_id, created_at, id);
alter table public.customer_support_messages enable row level security;
drop policy if exists customer_support_messages_participant_read on public.customer_support_messages;
create policy customer_support_messages_participant_read
  on public.customer_support_messages for select to authenticated
  using (
    exists (
      select 1 from public.customer_support_requests request
      where request.id = request_id
        and (request.user_id = auth.uid() or public.is_admin())
    )
  );
revoke all on public.customer_support_messages from public, anon, authenticated;
grant select on public.customer_support_messages to authenticated;

-- Backfill the existing single-message tickets into the conversation table.
insert into public.customer_support_messages(request_id, sender_user_id, sender_role, message, is_initial, created_at)
select request.id, request.user_id, 'customer', request.message, true, request.created_at
from public.customer_support_requests request
on conflict (request_id) where is_initial do nothing;

-- Attachments are private. Storage keys are user-id/request-id/random-file.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']::text[];

create or replace function public.support_attachment_upload_allowed(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select auth.uid() is not null
     and split_part(p_object_name, '/', 1) = auth.uid()::text
     and exists (
       select 1
       from public.customer_support_requests request
       where request.id::text = split_part(p_object_name, '/', 2)
         and (request.user_id = auth.uid() or public.is_admin())
     )
     and (
       select count(*)
       from storage.objects object_row
       where object_row.bucket_id = 'support-attachments'
         and split_part(object_row.name, '/', 1) = auth.uid()::text
         and split_part(object_row.name, '/', 2) = split_part(p_object_name, '/', 2)
     ) < 3;
$$;
revoke all on function public.support_attachment_upload_allowed(text) from public, anon, authenticated;
grant execute on function public.support_attachment_upload_allowed(text) to authenticated;

drop policy if exists support_attachments_participant_read on storage.objects;
create policy support_attachments_participant_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.customer_support_requests request
      where request.id::text = split_part(name, '/', 2)
        and (request.user_id = auth.uid() or public.is_admin())
    )
  );
drop policy if exists support_attachments_participant_insert on storage.objects;
create policy support_attachments_participant_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and public.support_attachment_upload_allowed(name)
  );
drop policy if exists support_attachments_participant_delete on storage.objects;
create policy support_attachments_participant_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.customer_support_requests request
      where request.id::text = split_part(name, '/', 2)
        and (request.user_id = auth.uid() or public.is_admin())
    )
  );

-- Update request activity timestamp whenever a message or attachment changes.
create or replace function public.touch_customer_support_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.customer_support_requests
  set last_message_at = greatest(last_message_at, new.created_at),
      updated_at = greatest(updated_at, new.created_at)
  where id = new.request_id;
  return new;
end;
$$;
revoke all on function public.touch_customer_support_request() from public, anon, authenticated;
drop trigger if exists customer_support_messages_touch_request on public.customer_support_messages;
create trigger customer_support_messages_touch_request
  after insert on public.customer_support_messages
  for each row execute function public.touch_customer_support_request();

-- Extend the activity event allowlists for support replies.
alter table public.admin_activity_events drop constraint if exists admin_activity_events_event_type_check;
alter table public.admin_activity_events
  add constraint admin_activity_events_event_type_check
  check (event_type in (
    'order_created','order_status_changed','order_payment_changed','review_created','customer_registered',
    'support_request_created','support_request_status_changed','support_request_message_received','support_reply_sent','coupon_redeemed'
  ));

create or replace function public.validate_support_attachment_list(
  p_request_id uuid,
  p_attachments jsonb,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_item jsonb;
  v_path text;
  v_name text;
  v_mime text;
  v_size bigint;
  v_count integer;
begin
  if p_attachments is null or jsonb_typeof(p_attachments) <> 'array' then
    raise exception 'Attachments must be a list';
  end if;
  v_count := jsonb_array_length(p_attachments);
  if v_count > 3 then raise exception 'Attach no more than 3 files to a support request'; end if;
  for v_item in select value from jsonb_array_elements(p_attachments)
  loop
    v_path := nullif(btrim(v_item ->> 'path'), '');
    v_name := nullif(btrim(v_item ->> 'name'), '');
    v_mime := lower(nullif(btrim(v_item ->> 'mime_type'), ''));
    v_size := nullif(v_item ->> 'size', '')::bigint;
    if v_path is null or v_name is null or char_length(v_name) > 200 then
      raise exception 'Attachment name or path is invalid';
    end if;
    if v_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
      raise exception 'Unsupported support attachment type';
    end if;
    if v_size is null or v_size < 1 or v_size > 5242880 then
      raise exception 'Each support attachment must be 5 MB or smaller';
    end if;
    if split_part(v_path, '/', 1) <> p_actor_id::text
       or split_part(v_path, '/', 2) <> p_request_id::text
       or not exists (
         select 1 from storage.objects object_row
         where object_row.bucket_id = 'support-attachments'
           and object_row.name = v_path
       ) then
      raise exception 'Attachment is not uploaded to this support request';
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.validate_support_attachment_list(uuid,jsonb,uuid) from public, anon, authenticated;

create or replace function public.create_customer_support_request(
  p_category text,
  p_subject text,
  p_message text,
  p_related_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  if p_related_order_id is not null and not exists (
    select 1 from public.orders where id = p_related_order_id and user_id = v_user
  ) then raise exception 'Choose one of your own orders'; end if;
  insert into public.customer_support_requests(user_id,category,subject,message,related_order_id)
  values (v_user,v_category,v_subject,v_message,p_related_order_id)
  returning id into v_id;
  insert into public.customer_support_messages(request_id,sender_user_id,sender_role,message,is_initial)
  values (v_id,v_user,'customer',v_message,true);
  return v_id;
end;
$$;
revoke all on function public.create_customer_support_request(text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.create_customer_support_request(text,text,text,uuid) to authenticated;

-- Keep the original three-argument client contract safe during staggered deployments.
create or replace function public.create_customer_support_request(p_category text,p_subject text,p_message text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.create_customer_support_request(p_category,p_subject,p_message,null::uuid);
$$;
revoke all on function public.create_customer_support_request(text,text,text) from public, anon, authenticated;
grant execute on function public.create_customer_support_request(text,text,text) to authenticated;

create or replace function public.attach_customer_support_request_files(p_request_id uuid,p_attachments jsonb)
returns integer
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_request public.customer_support_requests%rowtype;
  v_new_count integer;
  v_existing_count integer;
begin
  if v_user is null then raise exception 'Sign in to upload support attachments'; end if;
  select * into v_request from public.customer_support_requests where id = p_request_id for update;
  if not found then raise exception 'Support request was not found'; end if;
  if v_request.user_id <> v_user and not public.is_admin() then raise exception 'You cannot attach files to this request'; end if;
  v_new_count := public.validate_support_attachment_list(p_request_id,p_attachments,v_user);
  select coalesce(sum(jsonb_array_length(attachments)),0)::integer into v_existing_count
  from public.customer_support_messages where request_id = p_request_id;
  if v_existing_count + v_new_count > 3 then raise exception 'A support request can have at most 3 attachments'; end if;
  update public.customer_support_messages
  set attachments = attachments || p_attachments
  where request_id = p_request_id and is_initial;
  if not found then raise exception 'Initial support message was not found'; end if;
  update public.customer_support_requests set last_message_at = now(), updated_at = now() where id = p_request_id;
  return v_new_count;
end;
$$;
revoke all on function public.attach_customer_support_request_files(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.attach_customer_support_request_files(uuid,jsonb) to authenticated;

create or replace function public.add_customer_support_message(
  p_request_id uuid,
  p_message text,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_is_admin boolean;
  v_request public.customer_support_requests%rowtype;
  v_message text := nullif(btrim(p_message), '');
  v_attachments jsonb := coalesce(p_attachments, '[]'::jsonb);
  v_existing_count integer;
  v_new_count integer;
  v_message_id uuid;
begin
  if v_user is null then raise exception 'Sign in to reply to a support request'; end if;
  v_is_admin := public.is_admin();
  select * into v_request from public.customer_support_requests where id = p_request_id for update;
  if not found then raise exception 'Support request was not found'; end if;
  if v_request.user_id <> v_user and not v_is_admin then raise exception 'You cannot reply to this support request'; end if;
  if v_message is not null and char_length(v_message) > 2000 then raise exception 'Reply must be no more than 2,000 characters'; end if;
  if jsonb_typeof(v_attachments) <> 'array' then raise exception 'Attachments must be a list'; end if;
  v_new_count := public.validate_support_attachment_list(p_request_id,v_attachments,v_user);
  if v_message is null and v_new_count = 0 then raise exception 'Enter a reply or attach a file'; end if;
  select coalesce(sum(jsonb_array_length(attachments)),0)::integer into v_existing_count
  from public.customer_support_messages where request_id = p_request_id;
  if v_existing_count + v_new_count > 3 then raise exception 'A support request can have at most 3 attachments'; end if;
  if not v_is_admin and v_request.status = 'resolved' then
    update public.customer_support_requests set status = 'open', updated_at = now() where id = p_request_id;
  end if;
  insert into public.customer_support_messages(request_id,sender_user_id,sender_role,message,attachments)
  values (p_request_id,v_user,case when v_is_admin then 'admin' else 'customer' end,v_message,v_attachments)
  returning id into v_message_id;
  return v_message_id;
end;
$$;
revoke all on function public.add_customer_support_message(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.add_customer_support_message(uuid,text,jsonb) to authenticated;

create or replace function public.log_customer_support_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.customer_support_requests%rowtype;
  v_event_type text;
  v_title text;
  v_body text;
begin
  if new.is_initial then return new; end if;
  select * into v_request from public.customer_support_requests where id = new.request_id;
  if not found then return new; end if;
  if new.sender_role = 'admin' then
    v_event_type := 'support_reply_sent';
    v_title := 'Admin replied to support request';
    v_body := 'A workshop team member replied to ' || v_request.subject || '.';
  else
    v_event_type := 'support_request_message_received';
    v_title := 'Customer replied to support request';
    v_body := coalesce((select full_name from public.profiles where id = new.sender_user_id),'A customer') || ' replied to ' || v_request.subject || '.';
  end if;
  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
  values (
    'support-message:' || new.id,
    v_event_type,
    'support_request',
    new.request_id,
    new.sender_user_id,
    v_request.user_id,
    v_title,
    v_body,
    jsonb_build_object('category',v_request.category,'subject',v_request.subject,'status',v_request.status,'attachment_count',jsonb_array_length(new.attachments))
  ) on conflict (event_key) do nothing;
  if new.sender_role = 'admin' then
    insert into public.notifications(user_id,kind,title,body,action_url,expires_at)
    values (
      v_request.user_id,
      'update',
      'Workshop replied to your support request',
      left(coalesce(nullif(btrim(new.message), ''), 'A new file was added to your support conversation.'), 180),
      '/support/' || new.request_id::text,
      now() + interval '30 days'
    );
  end if;
  return new;
end;
$$;
revoke all on function public.log_customer_support_message_activity() from public, anon, authenticated;
drop trigger if exists customer_support_messages_activity on public.customer_support_messages;
create trigger customer_support_messages_activity
  after insert on public.customer_support_messages
  for each row execute function public.log_customer_support_message_activity();

create or replace function public.admin_update_customer_support_status(p_request_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.customer_support_requests%rowtype;
  v_old_status text;
  v_status_label text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if p_status not in ('open','in_progress','resolved') then raise exception 'Choose a valid support status'; end if;
  select * into v_request from public.customer_support_requests where id = p_request_id for update;
  if not found then raise exception 'Support request was not found'; end if;
  v_old_status := v_request.status;
  if v_old_status is distinct from p_status then
    update public.customer_support_requests set status=p_status,updated_at=now() where id=p_request_id returning * into v_request;
    v_status_label := case p_status when 'in_progress' then 'in progress' else p_status end;
    insert into public.notifications(user_id,kind,title,body,action_url,expires_at)
    values (
      v_request.user_id,
      'update',
      'Support request status updated',
      'Your request "' || left(v_request.subject,100) || '" is now ' || v_status_label || '.',
      '/support/' || v_request.id::text,
      now() + interval '30 days'
    );
  end if;
  return jsonb_build_object('id',v_request.id,'status',v_request.status,'updated_at',v_request.updated_at);
end;
$$;
revoke all on function public.admin_update_customer_support_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_customer_support_status(uuid,text) to authenticated;

-- Make ticket list and conversation refresh in real time for participants.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customer_support_requests') then
      alter publication supabase_realtime add table public.customer_support_requests;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customer_support_messages') then
      alter publication supabase_realtime add table public.customer_support_messages;
    end if;
  end if;
end;
$$;
