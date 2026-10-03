-- Secure, account-scoped store-pickup order creation.
-- Existing catalog rows with stock_quantity = 0 and in_stock = true are treated as
-- legacy/untracked stock; positive quantities are checked and decremented atomically.

alter table public.orders alter column status set default 'NEW';

do $$
begin
  if exists (select 1 from public.orders where user_id is null) then
    raise exception 'Cannot require customer ownership while orders with no user_id exist';
  end if;
  alter table public.orders alter column user_id set not null;
end;
$$;

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists notifications_user_unread_created_at_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- Customers must create complete orders through the RPC, not by supplying prices,
-- totals, order numbers, or another account's user_id in direct table inserts.
drop policy if exists orders_public_insert on public.orders;
drop policy if exists order_items_public_insert on public.order_items;

create table if not exists public.pickup_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pickup_tokens enable row level security;
revoke all on table public.pickup_tokens from public, anon, authenticated;

create or replace function public.notify_new_pickup_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, action_url)
  values (
    new.user_id,
    'order',
    'Order received',
    'Your store-pickup order #' || new.order_number || ' has been received.',
    '/profile'
  );
  return new;
end;
$$;
revoke all on function public.notify_new_pickup_order() from public, anon, authenticated;
drop trigger if exists orders_notify_new_pickup_order on public.orders;
create trigger orders_notify_new_pickup_order
  after insert on public.orders
  for each row execute function public.notify_new_pickup_order();

create or replace function public.record_pickup_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, 'Order status updated', auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.record_pickup_order_status_history() from public, anon, authenticated;
drop trigger if exists orders_record_status_history on public.orders;
create trigger orders_record_status_history
  after update of status on public.orders
  for each row execute function public.record_pickup_order_status_history();

create or replace function public.guard_pickup_order_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean := false;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  v_allowed := case old.status
    when 'NEW' then new.status in ('CONFIRMED', 'CANCELLED')
    when 'CONFIRMED' then new.status in ('PREPARING', 'CANCELLED')
    when 'PREPARING' then new.status in ('READY_FOR_PICKUP', 'CANCELLED')
    when 'READY_FOR_PICKUP' then new.status in ('PICKED_UP', 'CANCELLED')
    when 'PICKED_UP' then new.status = 'COMPLETED'
    else false
  end;
  if not v_allowed then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_pickup_order_status_transition() from public, anon, authenticated;
drop trigger if exists orders_guard_status_transition on public.orders;
create trigger orders_guard_status_transition
  before update of status on public.orders
  for each row execute function public.guard_pickup_order_status_transition();

create or replace function public.create_store_pickup_order(
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
begin
  if v_user_id is null then
    raise exception 'Authentication is required to place an order';
  end if;
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

  -- Prices and product names come only from the locked database rows. Positive
  -- stock counts are decremented atomically; zero is the existing legacy
  -- untracked-inventory sentinel, governed by products.in_stock.
  for v_item in select value from jsonb_array_elements(p_items) as input_items(value)
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
    if v_product.stock_quantity > 0 then
      if v_product.stock_quantity - v_product.reserved_quantity < v_quantity then
        raise exception 'Insufficient stock for %', v_product.name;
      end if;
      update public.products p
         set stock_quantity = p.stock_quantity - v_quantity,
             in_stock = (p.stock_quantity - v_quantity) > 0,
             updated_at = now()
       where p.id = v_product.id;
    end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon
      from public.coupons c
     where upper(c.code) = upper(trim(p_coupon_code))
       and c.is_active = true
       and c.starts_at <= now()
       and (c.ends_at is null or c.ends_at > now())
     for update;
    if not found then
      raise exception 'Coupon is invalid or expired';
    end if;
    if v_subtotal < v_coupon.minimum_order then
      raise exception 'Order does not meet the coupon minimum';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit has been reached';
    end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_subtotal * v_coupon.discount_value::numeric / 100)::integer;
    else
      v_discount := least(v_subtotal, v_coupon.discount_value);
    end if;
    if v_coupon.maximum_discount is not null then
      v_discount := least(v_discount, v_coupon.maximum_discount);
    end if;
    v_discount := greatest(0, least(v_subtotal, v_discount));
    if v_discount > 0 then
      update public.coupons c set usage_count = c.usage_count + 1 where c.id = v_coupon.id;
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
    payment_status, status, subtotal, discount, coupon_code, vehicle_model,
    fulfillment_method, pickup_store, pickup_note, total
  ) values (
    v_order_number, v_user_id, trim(p_customer_name), trim(p_customer_phone),
    v_payment_method, 'PENDING', 'NEW', v_subtotal, v_discount,
    case when v_discount > 0 then upper(trim(p_coupon_code)) else null end,
    nullif(trim(p_vehicle_model), ''), 'STORE_PICKUP', 'ROFIK GODI CENTRE',
    nullif(trim(coalesce(p_note, '')), ''), v_total
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) as input_items(value)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products p where p.id = v_product_id;
    insert into public.order_items (order_id, product_id, product_name, color, quantity, unit_price)
    values (v_order.id, v_product.id, v_product.name, left(coalesce(v_item->>'color', ''), 80), v_quantity, v_product.price);
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
revoke all on function public.create_store_pickup_order(jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_store_pickup_order(jsonb, text, text, text, text, text, text) to authenticated;

create or replace function public.verify_store_pickup_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if length(trim(coalesce(p_token, ''))) < 20 then
    raise exception 'Invalid pickup token';
  end if;
  select pt.order_id into v_order_id
    from public.pickup_tokens pt
   where pt.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
     and pt.used_at is null
     and pt.expires_at > now()
   for update;
  if not found then
    raise exception 'Pickup token is invalid, expired, or already used';
  end if;
  update public.orders o
     set status = 'PICKED_UP', picked_up_at = now()
   where o.id = v_order_id and o.status = 'READY_FOR_PICKUP'
   returning * into v_order;
  if not found then
    raise exception 'Order is not ready for pickup';
  end if;
  update public.pickup_tokens pt set used_at = now() where pt.order_id = v_order_id;
  return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status, 'picked_up_at', v_order.picked_up_at);
end;
$$;
revoke all on function public.verify_store_pickup_token(text) from public, anon;
grant execute on function public.verify_store_pickup_token(text) to authenticated;
