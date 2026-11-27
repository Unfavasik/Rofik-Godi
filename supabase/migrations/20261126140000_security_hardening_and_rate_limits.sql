-- Security hardening and distributed rate limiting across database RPCs, tables, and Edge Functions.
create extension if not exists pg_cron with schema pg_catalog;

-- 1. Distributed sliding-window rate-limit store (server-only access).
create table if not exists public.api_rate_limits (
  scope text not null,
  subject text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 1 check (hit_count >= 1),
  updated_at timestamptz not null default now(),
  constraint api_rate_limits_pkey primary key (scope, subject)
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits (updated_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.enforce_rate_limit(
  p_scope text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text := left(btrim(coalesce(p_scope, '')), 80);
  v_subject text := left(btrim(coalesce(p_subject, '')), 200);
  v_now timestamptz := now();
  v_window interval;
  v_row public.api_rate_limits%rowtype;
  v_reset_seconds integer;
begin
  if v_scope = '' or v_subject = '' or p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception using errcode = '22023', message = 'Invalid rate-limit parameters.';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.api_rate_limits as rl (scope, subject, window_started_at, hit_count, updated_at)
  values (v_scope, v_subject, v_now, 1, v_now)
  on conflict (scope, subject) do update
    set window_started_at = case
          when rl.window_started_at + v_window <= v_now then v_now
          else rl.window_started_at
        end,
        hit_count = case
          when rl.window_started_at + v_window <= v_now then 1
          else rl.hit_count + 1
        end,
        updated_at = v_now
  returning * into v_row;

  v_reset_seconds := greatest(
    1,
    ceil(extract(epoch from ((v_row.window_started_at + v_window) - v_now)))::integer
  );

  return jsonb_build_object(
    'allowed', v_row.hit_count <= p_limit,
    'remaining', greatest(0, p_limit - v_row.hit_count),
    'hit_count', v_row.hit_count,
    'limit', p_limit,
    'reset_in_seconds', v_reset_seconds
  );
end;
$$;
revoke all on function public.enforce_rate_limit(text, text, integer, integer) from public, anon, authenticated;

create or replace function public.require_rate_limit(
  p_scope text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer,
  p_message text default 'Too many requests. Please wait a moment and try again.'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  v_result := public.enforce_rate_limit(p_scope, p_subject, p_limit, p_window_seconds);
  if coalesce((v_result ->> 'allowed')::boolean, false) is not true then
    raise exception using errcode = 'P0429', message = coalesce(nullif(btrim(p_message), ''), 'Too many requests. Please try again shortly.');
  end if;
end;
$$;
revoke all on function public.require_rate_limit(text, text, integer, integer, text) from public, anon, authenticated;

create or replace function public.enforce_edge_rate_limit(
  p_scope text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.enforce_rate_limit(p_scope, p_subject, p_limit, p_window_seconds);
$$;
revoke all on function public.enforce_edge_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.enforce_edge_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.prune_expired_api_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.api_rate_limits
   where updated_at < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.prune_expired_api_rate_limits() from public, anon, authenticated;

select cron.unschedule('prune-expired-api-rate-limits')
where exists (select 1 from cron.job where jobname = 'prune-expired-api-rate-limits');
select cron.schedule(
  'prune-expired-api-rate-limits',
  '29 * * * *',
  $$select public.prune_expired_api_rate_limits();$$
);

-- 2. Column-level write integrity guards on notifications and price_drop_alerts.
create or replace function public.guard_customer_notification_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) <> 'service_role' and not public.is_admin() then
    if (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
      raise exception using errcode = '42501', message = 'Only notification read status may be updated.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_customer_notification_update() from public, anon, authenticated;
drop trigger if exists notifications_guard_customer_update on public.notifications;
create trigger notifications_guard_customer_update
  before update on public.notifications
  for each row execute function public.guard_customer_notification_update();

create or replace function public.guard_price_drop_alert_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_price numeric;
  v_product_active boolean;
  v_existing_count integer := 0;
begin
  if new.target_price is null or new.target_price <= 0 then
    raise exception using errcode = '22023', message = 'Target price must be greater than zero.';
  end if;

  if tg_op = 'INSERT' then
    select count(*)::integer into v_existing_count
      from public.price_drop_alerts a
     where a.user_id = new.user_id
       and a.product_id <> new.product_id;
    if v_existing_count >= 100 then
      raise exception using errcode = 'P0001', message = 'You can track up to 100 price drop alerts at once.';
    end if;
  end if;

  if tg_op = 'INSERT'
     or new.target_price is distinct from old.target_price
     or new.product_id is distinct from old.product_id then
    select p.price, p.is_active
      into v_product_price, v_product_active
      from public.products p
     where p.id = new.product_id;
    if not found or v_product_active is distinct from true then
      raise exception using errcode = 'P0002', message = 'This product is no longer available for price drop alerts.';
    end if;
    if new.target_price >= v_product_price then
      raise exception using errcode = '22023', message = 'Target price must be lower than the current price.';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.target_price is distinct from old.target_price then
    new.triggered_at := null;
    new.updated_at := now();
  end if;

  return new;
end;
$$;
revoke all on function public.guard_price_drop_alert_write() from public, anon, authenticated;
drop trigger if exists price_drop_alerts_guard_write on public.price_drop_alerts;
create trigger price_drop_alerts_guard_write
  before insert or update on public.price_drop_alerts
  for each row execute function public.guard_price_drop_alert_write();

-- 3. Rate-limit and harden customer-facing RPCs while preserving signatures and contracts.

create or replace function public.validate_coupon(p_code text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_rate jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'message', 'Sign in to apply a coupon.');
  end if;
  v_rate := public.enforce_rate_limit('rpc:validate_coupon', v_user_id::text, 30, 60);
  if coalesce((v_rate ->> 'allowed')::boolean, false) is not true then
    return jsonb_build_object('valid', false, 'message', 'Too many coupon checks. Please wait a minute and try again.');
  end if;
  return public._coupon_quote_for_customer(p_code, p_items, v_user_id, false);
end;
$$;
revoke all on function public.validate_coupon(text, jsonb) from public, anon;
grant execute on function public.validate_coupon(text, jsonb) to authenticated;

create or replace function public.create_store_pickup_order_v2(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_vehicle_model text,
  p_note text default null,
  p_payment_method text default 'PAY_AT_STORE',
  p_coupon_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_coupon public.coupons%rowtype;
  v_order public.orders%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_item_count integer := 0;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_order_number text;
  v_pickup_token text;
  v_payment_method text;
  v_thickness_option jsonb;
  v_thickness_label text;
  v_stitch text;
  v_embroidery_text text;
  v_item_unit_price integer;
  v_extra_price integer;
  v_canonical_items jsonb := '[]'::jsonb;
  v_coupon_quote jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to place an order';
  end if;
  perform public.require_rate_limit(
    'rpc:create_order',
    v_user_id::text,
    10,
    600,
    'Too many order attempts. Please wait a few minutes before trying again.'
  );
  if length(trim(coalesce(p_customer_name, ''))) not between 2 and 120 then
    raise exception 'Enter a valid customer name';
  end if;
  if length(trim(coalesce(p_customer_phone, ''))) not between 5 and 30 then
    raise exception 'Enter a valid contact phone number';
  end if;
  if length(trim(coalesce(p_vehicle_model, ''))) > 120 then
    raise exception 'Vehicle information is too long';
  end if;
  if length(coalesce(p_note, '')) > 500 then
    raise exception 'Order note is too long';
  end if;
  if p_payment_method not in ('PAY_AT_STORE', 'PAY_ONLINE') then
    raise exception 'Unsupported payment method';
  end if;
  v_payment_method := p_payment_method;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order items must be an array';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'An order must contain between 1 and 50 items';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items) as input_items(value)
    order by value->>'product_id'
  loop
    v_item_count := v_item_count + 1;
    if coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Invalid product';
    end if;
    if coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid item quantity';
    end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then
      raise exception 'Item quantity exceeds the allowed limit';
    end if;

    select * into v_product
      from public.products p
      where p.id = v_product_id and p.is_active = true
      for update;
    if not found or not v_product.in_stock then
      raise exception 'A selected product is no longer available';
    end if;

    v_thickness_label := nullif(left(trim(coalesce(v_item->>'thickness_label', '')), 80), '');
    if v_thickness_label is null then
      select left(coalesce(opt.value->>'label', 'Standard'), 80) into v_thickness_label
        from jsonb_array_elements(case when jsonb_typeof(v_product.thickness_options) = 'array' then v_product.thickness_options else '[]'::jsonb end) as opt(value)
       limit 1;
      v_thickness_label := coalesce(v_thickness_label, 'Standard');
    end if;
    v_thickness_option := null;
    select opt.value into v_thickness_option
      from jsonb_array_elements(case when jsonb_typeof(v_product.thickness_options) = 'array' then v_product.thickness_options else '[]'::jsonb end) as opt(value)
     where lower(trim(coalesce(opt.value->>'label', ''))) = lower(v_thickness_label)
     limit 1;
    if v_thickness_option is null and (v_thickness_label <> 'Standard' or jsonb_array_length(case when jsonb_typeof(v_product.thickness_options) = 'array' then v_product.thickness_options else '[]'::jsonb end) > 0) then
      raise exception 'A selected product option is no longer available';
    end if;
    v_extra_price := greatest(0, round(coalesce(nullif(v_thickness_option->>'extraPrice', '')::numeric, nullif(v_thickness_option->>'extra_price', '')::numeric, 0))::integer);
    v_stitch := left(trim(coalesce(v_item->>'stitch', '')), 80);
    if v_stitch <> '' and not (v_stitch = any(coalesce(v_product.stitch_patterns, '{}'::text[]))) then
      raise exception 'A selected stitch pattern is no longer available';
    end if;
    v_embroidery_text := left(trim(coalesce(v_item->>'embroidery_text', '')), 41);
    if length(v_embroidery_text) > 40 then
      raise exception 'Embroidery text must be 40 characters or less';
    end if;
    if v_embroidery_text <> '' and not v_product.is_customizable then
      raise exception 'Embroidery is not available for this product';
    end if;
    v_item_unit_price := v_product.price + v_extra_price + case when v_embroidery_text <> '' then 150 else 0 end;
    v_subtotal := v_subtotal + (v_item_unit_price * v_quantity);
    v_canonical_items := v_canonical_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'quantity', v_quantity, 'color', left(coalesce(v_item->>'color', ''), 80),
      'selected_thickness', v_thickness_label, 'selected_stitch', v_stitch,
      'custom_embroidery_text', nullif(v_embroidery_text, ''), 'unit_price', v_item_unit_price
    ));
  end loop;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_coupon_quote := public._coupon_quote_for_customer(
      p_coupon_code, v_canonical_items, v_user_id, true
    );
    if coalesce((v_coupon_quote->>'valid')::boolean, false) is not true then
      raise exception '%', coalesce(v_coupon_quote->>'message', 'Coupon is invalid or expired');
    end if;
    v_discount := round(coalesce((v_coupon_quote->>'discount')::numeric, 0))::integer;
    if v_discount > 0 then
      select * into v_coupon from public.coupons c
       where upper(c.code) = upper(regexp_replace(btrim(p_coupon_code), '\s+', '', 'g'))
       for update;
      if not found then raise exception 'Coupon is invalid or expired'; end if;
      update public.coupons c set used_count = c.used_count + 1 where c.id = v_coupon.id;
    end if;
  end if;
  v_total := greatest(0, v_subtotal - v_discount);

  loop
    v_order_number := 'RGC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.orders o where o.order_number = v_order_number);
  end loop;
  v_pickup_token := upper(encode(extensions.gen_random_bytes(24), 'hex'));

  insert into public.orders (
    order_number, user_id, customer_name, customer_phone, payment_method,
    payment_status, status, subtotal, discount, coupon_code, coupon_id,
    coupon_code_snapshot, discount_amount, vehicle_model,
    fulfillment_method, pickup_store, pickup_note, total
  ) values (
    v_order_number, v_user_id, trim(p_customer_name), trim(p_customer_phone),
    v_payment_method, 'PENDING', 'NEW', v_subtotal, v_discount,
    case when v_discount > 0 then v_coupon.code else null end,
    case when v_discount > 0 then v_coupon.id else null end,
    case when v_discount > 0 then v_coupon.code else null end,
    v_discount,
    nullif(trim(p_vehicle_model), ''), 'STORE_PICKUP', 'ROFIK GODI CENTRE',
    nullif(trim(coalesce(p_note, '')), ''), v_total
  ) returning * into v_order;

  if v_discount > 0 then
    insert into public.coupon_usages (coupon_id, customer_id, order_id, discount_amount)
    values (v_coupon.id, v_user_id, v_order.id, v_discount);
  end if;

  for v_item in select value from jsonb_array_elements(v_canonical_items) as input_items(value)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products p where p.id = v_product_id;
    v_item_unit_price := (v_item->>'unit_price')::integer;
    insert into public.order_items (
      order_id, product_id, product_name, color, quantity, unit_price,
      selected_thickness, selected_stitch, custom_embroidery_text
    ) values (
      v_order.id, v_product.id, v_product.name, left(coalesce(v_item->>'color', ''), 80), v_quantity, v_item_unit_price,
      nullif(v_item->>'selected_thickness', ''), nullif(v_item->>'selected_stitch', ''), nullif(v_item->>'custom_embroidery_text', '')
    );
  end loop;

  insert into public.pickup_tokens (order_id, token_hash, expires_at)
  values (
    v_order.id,
    encode(extensions.digest(v_pickup_token, 'sha256'), 'hex'),
    now() + interval '30 days'
  );

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'total', v_order.total,
    'created_at', v_order.created_at,
    'pickup_token', v_pickup_token
  );
end;
$$;
revoke all on function public.create_store_pickup_order_v2(jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_store_pickup_order_v2(jsonb, text, text, text, text, text, text) to authenticated;

create or replace function public.create_store_pickup_order_v3(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_vehicle_type text,
  p_vehicle_company text,
  p_vehicle_model text,
  p_vehicle_image_url text default null,
  p_note text default null,
  p_payment_method text default 'PAY_AT_STORE',
  p_coupon_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_result jsonb;
  v_order_id uuid;
  v_vehicle_type text := nullif(left(trim(coalesce(p_vehicle_type, '')), 40), '');
  v_vehicle_company text := nullif(left(trim(coalesce(p_vehicle_company, '')), 80), '');
  v_vehicle_image_url text := nullif(left(trim(coalesce(p_vehicle_image_url, '')), 2048), '');
begin
  if length(trim(coalesce(p_vehicle_type, ''))) > 40 then
    raise exception 'Vehicle type is too long';
  end if;
  if length(trim(coalesce(p_vehicle_company, ''))) > 80 then
    raise exception 'Vehicle company is too long';
  end if;
  if length(trim(coalesce(p_vehicle_image_url, ''))) > 2048 then
    raise exception 'Vehicle image URL is too long';
  end if;
  if v_vehicle_image_url is not null
     and v_vehicle_image_url !~* '^https://[^\s<>"'']+$'
     and v_vehicle_image_url !~ '^/[^/][^\s<>"'']*$' then
    raise exception 'Vehicle image URL must be an HTTPS or relative application path';
  end if;

  v_result := public.create_store_pickup_order_v2(
    p_items,
    p_customer_name,
    p_customer_phone,
    p_vehicle_model,
    p_note,
    p_payment_method,
    p_coupon_code
  );
  v_order_id := (v_result->>'id')::uuid;

  update public.orders
     set vehicle_type = v_vehicle_type,
         vehicle_company = v_vehicle_company,
         vehicle_image_url = v_vehicle_image_url
   where id = v_order_id;

  return v_result;
end;
$$;
revoke all on function public.create_store_pickup_order_v3(jsonb, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_store_pickup_order_v3(jsonb, text, text, text, text, text, text, text, text, text) to authenticated;

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
  perform public.require_rate_limit(
    'rpc:create_support_request',
    v_user::text,
    5,
    900,
    'Too many support requests submitted recently. Please wait before opening another request.'
  );
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
  perform public.require_rate_limit(
    'rpc:attach_support_files',
    v_user::text,
    20,
    300,
    'Too many attachment requests. Please wait a few minutes.'
  );
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
  if not v_is_admin then
    perform public.require_rate_limit(
      'rpc:support_message',
      v_user::text,
      30,
      300,
      'Too many support messages sent. Please wait a moment before replying again.'
    );
  end if;
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

create or replace function public.create_product_review(
  p_product_id uuid,
  p_order_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_author text;
  v_text text := nullif(btrim(p_review_text), '');
begin
  if v_user_id is null or not exists (select 1 from auth.users u where u.id = v_user_id) then
    raise exception 'Sign in is required to write a review';
  end if;
  perform public.require_rate_limit(
    'rpc:create_review',
    v_user_id::text,
    15,
    900,
    'Too many review submissions. Please wait a few minutes.'
  );
  if p_product_id is null or p_order_id is null then
    raise exception 'A product and completed order are required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if v_text is not null and char_length(v_text) > 2000 then
    raise exception 'Review text must be 2,000 characters or fewer';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Customer profile is not available';
  end if;
  if not exists (
    select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
     where o.id = p_order_id
       and o.user_id = v_user_id
       and o.status = 'COMPLETED'
       and oi.product_id = p_product_id
  ) then
    raise exception 'A completed purchase of this product is required';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 'Customer')
    into v_author
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = v_user_id;

  insert into public.reviews (
    product_id, user_id, customer_id, order_id, author_name, rating,
    body, review_text, status, verified_purchase, is_verified_purchase,
    is_published, updated_at
  ) values (
    p_product_id, v_user_id, v_user_id, p_order_id, coalesce(v_author, 'Customer'), p_rating,
    coalesce(v_text, ''), v_text, 'published', true, true, true, now()
  ) returning * into v_review;

  return to_jsonb(v_review);
exception
  when unique_violation then
    raise exception 'You have already reviewed this product for this order' using errcode = '23505';
end;
$$;
revoke all on function public.create_product_review(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.create_product_review(uuid, uuid, integer, text) to authenticated;

create or replace function public.update_product_review(
  p_review_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_text text := nullif(btrim(p_review_text), '');
  v_review public.reviews%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in is required to edit a review'; end if;
  perform public.require_rate_limit(
    'rpc:update_review',
    v_user_id::text,
    20,
    900,
    'Too many review updates. Please wait a few minutes.'
  );
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if v_text is not null and char_length(v_text) > 2000 then raise exception 'Review text must be 2,000 characters or fewer'; end if;

  update public.reviews r
     set rating = p_rating,
         body = coalesce(v_text, ''),
         review_text = v_text,
         updated_at = now()
   where r.id = p_review_id
     and r.customer_id = v_user_id
     and r.is_verified_purchase = true
     and exists (
       select 1 from public.orders o
       join public.order_items oi on oi.order_id = o.id
       where o.id = r.order_id
         and o.user_id = v_user_id
         and o.status = 'COMPLETED'
         and oi.product_id = r.product_id
     )
   returning r.* into v_review;
  if not found then raise exception 'Review not found or no longer eligible to edit'; end if;
  return to_jsonb(v_review);
end;
$$;
revoke all on function public.update_product_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.update_product_review(uuid, integer, text) to authenticated;

create or replace function public.create_my_stock_alert(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
  v_product_active boolean;
  v_product_in_stock boolean;
  v_existing_count integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to create a restock alert.';
  end if;
  perform public.require_rate_limit(
    'rpc:stock_alert',
    v_user_id::text,
    30,
    300,
    'Too many stock alert requests. Please wait a few minutes.'
  );
  if p_product_id is null then
    raise exception using errcode = '22023', message = 'A product is required for a restock alert.';
  end if;
  select p.is_active, p.in_stock
    into v_product_active, v_product_in_stock
    from public.products p
    where p.id = p_product_id
    for update;
  if not found or v_product_active is distinct from true then
    raise exception using errcode = 'P0002', message = 'This product is no longer available for restock alerts.';
  end if;
  if v_product_in_stock is distinct from false then
    raise exception using errcode = '22023', message = 'This product is already in stock.';
  end if;

  select count(*)::integer into v_existing_count
    from public.stock_alerts s
   where s.user_id = v_user_id
     and s.product_id <> p_product_id;
  if v_existing_count >= 100 then
    raise exception using errcode = 'P0001', message = 'You can track up to 100 restock alerts at once.';
  end if;

  insert into public.stock_alerts (user_id, product_id)
  values (v_user_id, p_product_id)
  on conflict (user_id, product_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;
revoke all on function public.create_my_stock_alert(uuid) from public, anon, authenticated;
grant execute on function public.create_my_stock_alert(uuid) to authenticated;

create or replace function public.upsert_my_price_drop_alert(
  p_product_id uuid,
  p_target_price numeric
)
returns public.price_drop_alerts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_price numeric;
  v_product_active boolean;
  v_existing_count integer := 0;
  v_row public.price_drop_alerts;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to set a price drop alert.';
  end if;
  perform public.require_rate_limit(
    'rpc:price_drop_alert',
    v_user_id::text,
    30,
    300,
    'Too many price drop alert updates. Please wait a few minutes.'
  );
  if p_product_id is null then
    raise exception using errcode = '22023', message = 'A product is required for a price drop alert.';
  end if;
  if p_target_price is null or p_target_price <= 0 then
    raise exception using errcode = '22023', message = 'Target price must be greater than zero.';
  end if;

  select p.price, p.is_active
    into v_product_price, v_product_active
    from public.products p
    where p.id = p_product_id
    for update;

  if not found or v_product_active is distinct from true then
    raise exception using errcode = 'P0002', message = 'This product is no longer available for price drop alerts.';
  end if;

  if p_target_price >= v_product_price then
    raise exception using errcode = '22023', message = 'Target price must be lower than the current price.';
  end if;

  select count(*)::integer into v_existing_count
    from public.price_drop_alerts a
   where a.user_id = v_user_id
     and a.product_id <> p_product_id;
  if v_existing_count >= 100 then
    raise exception using errcode = 'P0001', message = 'You can track up to 100 price drop alerts at once.';
  end if;

  insert into public.price_drop_alerts (
    user_id,
    product_id,
    target_price,
    initial_price,
    triggered_at,
    updated_at
  )
  values (
    v_user_id,
    p_product_id,
    round(p_target_price, 2),
    v_product_price,
    null,
    now()
  )
  on conflict (user_id, product_id) do update
    set target_price = round(excluded.target_price, 2),
        initial_price = v_product_price,
        triggered_at = null,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.upsert_my_price_drop_alert(uuid, numeric) from public, anon, authenticated;
grant execute on function public.upsert_my_price_drop_alert(uuid, numeric) to authenticated;

create or replace function public.issue_my_store_pickup_token(p_order_number text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_status text;
  v_order_number text := regexp_replace(btrim(coalesce(p_order_number, '')), '^#', '');
  v_token text;
begin
  if v_user_id is null then
    raise exception 'Sign in to view your pickup QR';
  end if;
  perform public.require_rate_limit(
    'rpc:pickup_token',
    v_user_id::text,
    30,
    300,
    'Too many pickup QR requests. Please wait a moment.'
  );
  if length(v_order_number) not between 1 and 80 then
    raise exception 'Pickup QR is not available for this order';
  end if;

  select o.id, o.status
    into v_order_id, v_status
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = v_user_id
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Pickup QR is not available for this order';
  end if;

  if v_status not in ('NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') then
    return null;
  end if;

  v_token := upper(encode(extensions.gen_random_bytes(24), 'hex'));
  insert into public.pickup_tokens (order_id, token_hash, expires_at, used_at, created_at)
  values (
    v_order_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '30 days',
    null,
    now()
  )
  on conflict (order_id) do update
    set token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        used_at = null,
        created_at = now();

  return v_token;
end;
$$;
revoke all on function public.issue_my_store_pickup_token(text) from public, anon, authenticated;
grant execute on function public.issue_my_store_pickup_token(text) to authenticated;

create or replace function public.cancel_my_order(
  p_order_number text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_order_number text := trim(coalesce(p_order_number, ''));
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_cancelled_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel this order';
  end if;
  perform public.require_rate_limit(
    'rpc:cancel_order',
    v_user_id::text,
    15,
    300,
    'Too many order cancellation attempts. Please wait a few minutes.'
  );
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;
  if length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Cancellation reason must be 500 characters or fewer';
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = v_user_id
   for update;
  if not found then
    raise exception 'Order not found or you do not have permission to cancel it';
  end if;
  if v_order.status <> 'NEW' then
    raise exception 'Only a new, unconfirmed order can be cancelled';
  end if;
  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    raise exception 'Paid orders cannot be cancelled online. Please contact the store';
  end if;

  update public.orders o
     set status = 'CANCELLED'
   where o.id = v_order.id
   returning o.* into v_order;
  v_cancelled_at := now();

  update public.order_status_history h
     set note = case
       when v_reason is null then 'Cancelled by customer'
       else 'Customer cancellation: ' || v_reason
     end
   where h.order_id = v_order.id
     and h.to_status = 'CANCELLED'
     and h.changed_by = v_user_id
     and h.note = 'Order status updated';

  insert into public.notifications (user_id, kind, title, body, action_url)
  select au.user_id,
         'order',
         'Order cancelled by customer',
         'Customer cancelled order #' || v_order.order_number || '.' ||
           case when v_reason is null then '' else ' Reason: ' || v_reason end,
         '/admin/orders/' || v_order.order_number
    from public.admin_users au
   where au.user_id is distinct from v_user_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'cancelled_at', v_cancelled_at,
    'reason', v_reason
  );
end;
$$;
revoke all on function public.cancel_my_order(text, text) from public, anon, authenticated;
grant execute on function public.cancel_my_order(text, text) to authenticated;

create or replace function public.cancel_unpaid_online_order(
  p_order_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_order_number text := trim(coalesce(p_order_number, ''));
  v_cancelled_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel this payment attempt';
  end if;
  perform public.require_rate_limit(
    'rpc:cancel_unpaid_order',
    v_user_id::text,
    20,
    300,
    'Too many payment closure requests. Please wait a moment.'
  );
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = v_user_id
   for update;
  if not found then
    raise exception 'Order not found or you do not have permission to cancel it';
  end if;
  if v_order.payment_method <> 'PAY_ONLINE' then
    raise exception 'Only an online payment draft can be closed';
  end if;
  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    raise exception 'A paid order cannot be closed as an unpaid payment attempt';
  end if;
  if v_order.status = 'CANCELLED' then
    return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status);
  end if;
  if v_order.status <> 'NEW' then
    raise exception 'Only a new unpaid online order can be closed';
  end if;

  update public.orders
     set status = 'CANCELLED'
   where id = v_order.id
   returning * into v_order;
  v_cancelled_at := now();

  update public.order_status_history h
     set note = 'Online payment cancelled before capture'
   where h.order_id = v_order.id
     and h.to_status = 'CANCELLED'
     and h.changed_by = v_user_id
     and h.note = 'Order status updated';

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'cancelled_at', v_cancelled_at
  );
end;
$$;
revoke all on function public.cancel_unpaid_online_order(text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_online_order(text) to authenticated;

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
  perform public.require_rate_limit(
    'rpc:account_deletion',
    v_user_id::text,
    10,
    3600,
    'Too many account deletion updates. Please try again later.'
  );
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
revoke all on function public.request_account_deletion(text, text) from public, anon, authenticated;
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
  perform public.require_rate_limit(
    'rpc:account_deletion',
    v_user_id::text,
    10,
    3600,
    'Too many account deletion updates. Please try again later.'
  );
  update public.account_deletion_requests
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where user_id = v_user_id and status = 'scheduled';
  return found;
end;
$$;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
