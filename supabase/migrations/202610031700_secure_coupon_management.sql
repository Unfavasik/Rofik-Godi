-- Secure coupon management for Rofik Godi Centre.
-- This file is intentionally staged in the repository first; apply it to the live
-- Supabase project only after reviewing the migration plan.

-- Normalize the existing coupon foundation table while preserving any rows.
alter table public.coupons rename column minimum_order to minimum_order_value;
alter table public.coupons rename column maximum_discount to max_discount;
alter table public.coupons rename column usage_count to used_count;
alter table public.coupons rename column ends_at to expires_at;
alter table public.coupons rename column is_active to is_enabled;

do $$
begin
  if exists (
    select 1 from public.coupons
    group by upper(regexp_replace(btrim(code), '\s+', '', 'g'))
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate coupon codes (ignoring case/whitespace) before applying coupon management.';
  end if;
end;
$$;

alter table public.coupons drop constraint if exists coupons_discount_type_check;
alter table public.coupons drop constraint if exists coupons_discount_value_check;
alter table public.coupons drop constraint if exists coupons_minimum_order_value_check;
alter table public.coupons drop constraint if exists coupons_minimum_order_check;
alter table public.coupons drop constraint if exists coupons_usage_count_check;
alter table public.coupons drop constraint if exists coupons_used_count_check;

update public.coupons
   set code = upper(regexp_replace(btrim(code), '\s+', '', 'g')),
       discount_type = case lower(discount_type)
         when 'percent' then 'PERCENTAGE'
         when 'percentage' then 'PERCENTAGE'
         when 'fixed' then 'FIXED'
         else upper(discount_type)
       end,
       expires_at = coalesce(expires_at, starts_at + interval '1 year');

alter table public.coupons
  alter column code set not null,
  alter column discount_type set default 'PERCENTAGE',
  alter column discount_value type numeric(12,2) using discount_value::numeric(12,2),
  alter column minimum_order_value type numeric(12,2) using minimum_order_value::numeric(12,2),
  alter column max_discount type numeric(12,2) using max_discount::numeric(12,2),
  alter column expires_at set not null;

alter table public.coupons add column if not exists per_customer_limit integer;
alter table public.coupons add column if not exists eligibility text not null default 'EVERYONE';
alter table public.coupons add column if not exists apply_to text not null default 'ALL_PRODUCTS';
alter table public.coupons add column if not exists description text;
alter table public.coupons add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.coupons add column if not exists updated_at timestamptz not null default now();

alter table public.coupons add constraint coupons_code_safe_check
  check (code ~ '^[A-Z0-9_-]{3,40}$');
alter table public.coupons add constraint coupons_discount_type_check
  check (discount_type in ('PERCENTAGE','FIXED'));
alter table public.coupons add constraint coupons_discount_value_check
  check (discount_value > 0 and (discount_type <> 'PERCENTAGE' or discount_value <= 100));
alter table public.coupons add constraint coupons_max_discount_check
  check (max_discount is null or max_discount > 0);
alter table public.coupons add constraint coupons_minimum_order_value_check
  check (minimum_order_value >= 0);
alter table public.coupons add constraint coupons_usage_limit_check
  check (usage_limit is null or usage_limit > 0);
alter table public.coupons add constraint coupons_used_count_check
  check (used_count >= 0);
alter table public.coupons add constraint coupons_per_customer_limit_check
  check (per_customer_limit is null or per_customer_limit > 0);
alter table public.coupons add constraint coupons_validity_check
  check (expires_at > starts_at);
alter table public.coupons add constraint coupons_eligibility_check
  check (eligibility in ('EVERYONE','FIRST_ORDER','EXISTING_CUSTOMERS'));
alter table public.coupons add constraint coupons_apply_to_check
  check (apply_to in ('ALL_PRODUCTS','SELECTED_PRODUCTS','SELECTED_CATEGORIES'));

create unique index if not exists coupons_code_case_insensitive_uidx
  on public.coupons (upper(code));
create index if not exists coupons_enabled_validity_idx
  on public.coupons (is_enabled, starts_at, expires_at);

create table if not exists public.coupon_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

create table if not exists public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_key text not null check (category_key in ('bike','scooter','toto','cushion','accessory')),
  primary key (coupon_id, category_key)
);

create table if not exists public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  discount_amount numeric(12,2) not null check (discount_amount > 0),
  created_at timestamptz not null default now(),
  constraint coupon_usages_coupon_customer_order_key unique (coupon_id, customer_id, order_id)
);

create index if not exists coupon_usages_customer_idx
  on public.coupon_usages (coupon_id, customer_id, created_at desc);
create index if not exists coupon_usages_order_idx
  on public.coupon_usages (order_id);

alter table public.orders add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.orders add column if not exists coupon_code_snapshot text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);
update public.orders
   set coupon_code_snapshot = coalesce(coupon_code_snapshot, coupon_code),
       discount_amount = case when discount_amount = 0 then coalesce(discount, 0) else discount_amount end;

-- The pickup token table is part of the atomic order function and stores only a hash.
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
  values (new.user_id, 'order', 'Order received',
          'Your store-pickup order #' || new.order_number || ' has been received.', '/profile');
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
  if new.status is not distinct from old.status then return new; end if;
  v_allowed := case old.status
    when 'NEW' then new.status in ('CONFIRMED', 'CANCELLED')
    when 'CONFIRMED' then new.status in ('PREPARING', 'CANCELLED')
    when 'PREPARING' then new.status in ('READY_FOR_PICKUP', 'CANCELLED')
    when 'READY_FOR_PICKUP' then new.status in ('PICKED_UP', 'CANCELLED')
    when 'PICKED_UP' then new.status = 'COMPLETED'
    else false
  end;
  if not v_allowed then raise exception 'Invalid order status transition: % -> %', old.status, new.status; end if;
  return new;
end;
$$;
revoke all on function public.guard_pickup_order_status_transition() from public, anon, authenticated;
drop trigger if exists orders_guard_status_transition on public.orders;
create trigger orders_guard_status_transition
  before update of status on public.orders
  for each row execute function public.guard_pickup_order_status_transition();

-- No customer role can list coupon rules or write usage counters. Customers use
-- validate_coupon() and the order RPC; admin reads are protected by is_admin().
drop policy if exists coupons_active_public_read on public.coupons;
drop policy if exists coupons_admin_all on public.coupons;
alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;
alter table public.coupon_categories enable row level security;
alter table public.coupon_usages enable row level security;

revoke all on table public.coupons, public.coupon_products, public.coupon_categories, public.coupon_usages from public, anon, authenticated;
grant select on table public.coupons, public.coupon_products, public.coupon_categories, public.coupon_usages to authenticated;

create policy coupons_admin_read on public.coupons
  for select to authenticated using (public.is_admin());
create policy coupon_products_admin_read on public.coupon_products
  for select to authenticated using (public.is_admin());
create policy coupon_categories_admin_read on public.coupon_categories
  for select to authenticated using (public.is_admin());
create policy coupon_usages_admin_read on public.coupon_usages
  for select to authenticated using (public.is_admin());

-- Public offer cards expose only active rules customers need: no coupon IDs,
-- redemption counts, customer identities, or internal usage analytics.
create or replace function public.list_available_coupon_offers()
returns table (
  code text,
  discount_type text,
  discount_value numeric,
  minimum_order_value numeric,
  max_discount numeric,
  expires_at timestamptz,
  eligibility text,
  apply_to text,
  description text,
  product_names text[],
  category_keys text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select upper(c.code), c.discount_type, c.discount_value, c.minimum_order_value,
         c.max_discount, c.expires_at, c.eligibility, c.apply_to, c.description,
         case when c.apply_to = 'SELECTED_PRODUCTS' then array(
           select p.name from public.coupon_products cp
           join public.products p on p.id = cp.product_id
           where cp.coupon_id = c.id and p.is_active = true
           order by p.name limit 10
         ) else '{}'::text[] end,
         case when c.apply_to = 'SELECTED_CATEGORIES' then array(
           select cc.category_key from public.coupon_categories cc
           where cc.coupon_id = c.id order by cc.category_key
         ) else '{}'::text[] end
    from public.coupons c
   where c.is_enabled = true
     and c.starts_at <= now()
     and c.expires_at > now()
     and (c.usage_limit is null or c.used_count < c.usage_limit)
     and (c.per_customer_limit is null or auth.uid() is null or
          (select count(*) from public.coupon_usages cu
            where cu.coupon_id = c.id and cu.customer_id = auth.uid()) < c.per_customer_limit)
     and (c.apply_to <> 'SELECTED_PRODUCTS' or exists (
           select 1 from public.coupon_products cp join public.products p on p.id = cp.product_id
            where cp.coupon_id = c.id and p.is_active = true))
     and (c.apply_to <> 'SELECTED_CATEGORIES' or exists (
           select 1 from public.coupon_categories cc where cc.coupon_id = c.id))
     and (
       c.eligibility = 'EVERYONE'
       or (auth.uid() is not null and c.eligibility = 'FIRST_ORDER' and not exists (
             select 1 from public.orders o where o.user_id = auth.uid()))
       or (auth.uid() is not null and c.eligibility = 'EXISTING_CUSTOMERS' and exists (
             select 1 from public.orders o where o.user_id = auth.uid()))
     )
   order by c.expires_at, c.code
   limit 50;
$$;
revoke all on function public.list_available_coupon_offers() from public, anon, authenticated;
grant execute on function public.list_available_coupon_offers() to anon, authenticated;

grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_admin() from anon;

create or replace function public._coupon_quote_for_customer(
  p_code text,
  p_items jsonb,
  p_user_id uuid,
  p_lock_coupon boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_code text := upper(regexp_replace(btrim(coalesce(p_code, '')), '\s+', '', 'g'));
  v_coupon public.coupons%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
  v_eligible_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_has_qualifying_order boolean := false;
  v_customer_uses integer := 0;
  v_applies boolean;
begin
  if p_user_id is null or auth.uid() is distinct from p_user_id then
    return jsonb_build_object('valid', false, 'message', 'Sign in to apply a coupon.');
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,40}$' then
    return jsonb_build_object('valid', false, 'message', 'Enter a valid coupon code.');
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) not between 1 and 50 then
    return jsonb_build_object('valid', false, 'message', 'Your cart could not be validated.');
  end if;

  if p_lock_coupon then
    select * into v_coupon from public.coupons c where upper(c.code) = v_code for update;
  else
    select * into v_coupon from public.coupons c where upper(c.code) = v_code;
  end if;
  if not found then
    return jsonb_build_object('valid', false, 'message', 'Coupon is invalid or expired.');
  end if;
  if not v_coupon.is_enabled then
    return jsonb_build_object('valid', false, 'message', 'Coupon is invalid or expired.');
  end if;
  if now() < v_coupon.starts_at then
    return jsonb_build_object('valid', false, 'message', 'This coupon is not active yet.');
  end if;
  if now() > v_coupon.expires_at then
    return jsonb_build_object('valid', false, 'message', 'Coupon is invalid or expired.');
  end if;
  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    return jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit.');
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items) as input_items(value)
    order by value->>'product_id'
  loop
    if coalesce(v_item->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_item->>'quantity','') !~ '^[1-9][0-9]*$' then
      return jsonb_build_object('valid', false, 'message', 'One or more cart items could not be validated.');
    end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then
      return jsonb_build_object('valid', false, 'message', 'An item quantity exceeds the allowed limit.');
    end if;
    select * into v_product
      from public.products p
     where p.id = v_product_id and p.is_active = true
       and (p_lock_coupon or p.in_stock = true);
    if not found then
      return jsonb_build_object('valid', false, 'message', 'A selected product is no longer available.');
    end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    v_applies := case v_coupon.apply_to
      when 'ALL_PRODUCTS' then true
      when 'SELECTED_PRODUCTS' then exists (
        select 1 from public.coupon_products cp
         where cp.coupon_id = v_coupon.id and cp.product_id = v_product.id
      )
      when 'SELECTED_CATEGORIES' then exists (
        select 1 from public.coupon_categories cc
         where cc.coupon_id = v_coupon.id and cc.category_key = v_product.category_key
      )
      else false
    end;
    if v_applies then
      v_eligible_subtotal := v_eligible_subtotal + (v_product.price * v_quantity);
    end if;
  end loop;

  if v_subtotal < v_coupon.minimum_order_value then
    return jsonb_build_object(
      'valid', false,
      'message', 'Add ₹' || ceil(v_coupon.minimum_order_value - v_subtotal)::text || ' more to use this coupon.',
      'subtotal', v_subtotal
    );
  end if;
  if v_eligible_subtotal <= 0 then
    return jsonb_build_object('valid', false, 'message', 'This coupon does not apply to items in your cart.');
  end if;

  select exists (
    select 1 from public.orders o
     where o.user_id = p_user_id
       and o.status <> 'CANCELLED'
       and (o.status in ('PICKED_UP','COMPLETED') or upper(coalesce(o.payment_status,'')) = 'PAID')
  ) into v_has_qualifying_order;
  if v_coupon.eligibility = 'FIRST_ORDER' and v_has_qualifying_order then
    return jsonb_build_object('valid', false, 'message', 'This coupon is for first orders only.');
  end if;
  if v_coupon.eligibility = 'EXISTING_CUSTOMERS' and not v_has_qualifying_order then
    return jsonb_build_object('valid', false, 'message', 'This coupon is for existing customers.');
  end if;

  select count(*)::integer into v_customer_uses
    from public.coupon_usages cu
   where cu.coupon_id = v_coupon.id and cu.customer_id = p_user_id;
  if v_coupon.per_customer_limit is not null and v_customer_uses >= v_coupon.per_customer_limit then
    return jsonb_build_object('valid', false, 'message', 'You have reached this coupon’s per-customer limit.');
  end if;

  if v_coupon.discount_type = 'PERCENTAGE' then
    v_discount := round(v_eligible_subtotal * v_coupon.discount_value / 100);
  else
    v_discount := least(v_eligible_subtotal, v_coupon.discount_value);
  end if;
  if v_coupon.max_discount is not null then
    v_discount := least(v_discount, v_coupon.max_discount);
  end if;
  v_discount := greatest(0, least(v_eligible_subtotal, v_discount));
  if v_discount <= 0 then
    return jsonb_build_object('valid', false, 'message', 'This coupon does not apply to items in your cart.');
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'subtotal', v_subtotal,
    'eligible_subtotal', v_eligible_subtotal,
    'discount', v_discount,
    'discount_amount', v_discount,
    'final_total', greatest(0, v_subtotal - v_discount),
    'customer_uses', v_customer_uses,
    'message', 'Coupon applied successfully.'
  );
end;
$$;
revoke all on function public._coupon_quote_for_customer(text, jsonb, uuid, boolean) from public, anon, authenticated;

create or replace function public.validate_coupon(p_code text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'message', 'Sign in to apply a coupon.');
  end if;
  return public._coupon_quote_for_customer(p_code, p_items, auth.uid(), false);
end;
$$;
revoke all on function public.validate_coupon(text, jsonb) from public, anon;
grant execute on function public.validate_coupon(text, jsonb) to authenticated;

create or replace function public.save_coupon(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_code text := upper(regexp_replace(btrim(coalesce(p_payload->>'code','')), '\s+', '', 'g'));
  v_discount_type text := upper(coalesce(p_payload->>'discount_type',''));
  v_discount_value numeric(12,2);
  v_max_discount numeric(12,2);
  v_minimum_order numeric(12,2) := coalesce(nullif(p_payload->>'minimum_order_value','')::numeric, 0);
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_usage_limit integer;
  v_per_customer_limit integer;
  v_eligibility text := upper(coalesce(p_payload->>'eligibility','EVERYONE'));
  v_apply_to text := upper(coalesce(p_payload->>'apply_to','ALL_PRODUCTS'));
  v_enabled boolean := coalesce((p_payload->>'is_enabled')::boolean, true);
  v_description text := nullif(left(btrim(coalesce(p_payload->>'description','')), 500), '');
  v_product_ids jsonb := coalesce(p_payload->'product_ids','[]'::jsonb);
  v_category_keys jsonb := coalesce(p_payload->'category_keys','[]'::jsonb);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,40}$' then
    raise exception 'Coupon code must use 3–40 letters, numbers, underscores or hyphens';
  end if;
  if v_discount_type not in ('PERCENTAGE','FIXED') then
    raise exception 'Choose a valid discount type';
  end if;
  v_discount_value := (p_payload->>'discount_value')::numeric;
  if v_discount_value <= 0 or (v_discount_type = 'PERCENTAGE' and v_discount_value > 100) then
    raise exception 'Enter a valid discount value';
  end if;
  if v_minimum_order < 0 then raise exception 'Minimum order cannot be negative'; end if;
  v_max_discount := nullif(p_payload->>'max_discount','')::numeric;
  if v_max_discount is not null and v_max_discount <= 0 then raise exception 'Maximum discount must be greater than zero'; end if;
  v_starts_at := (p_payload->>'starts_at')::timestamptz;
  v_expires_at := (p_payload->>'expires_at')::timestamptz;
  if v_expires_at <= v_starts_at then raise exception 'Expiry must be after the start time'; end if;
  v_usage_limit := nullif(p_payload->>'usage_limit','')::integer;
  v_per_customer_limit := nullif(p_payload->>'per_customer_limit','')::integer;
  if v_usage_limit is not null and v_usage_limit <= 0 then raise exception 'Usage limit must be positive or unlimited'; end if;
  if v_per_customer_limit is not null and v_per_customer_limit <= 0 then raise exception 'Per-customer limit must be positive or unlimited'; end if;
  if v_eligibility not in ('EVERYONE','FIRST_ORDER','EXISTING_CUSTOMERS') then raise exception 'Choose a valid customer eligibility'; end if;
  if v_apply_to not in ('ALL_PRODUCTS','SELECTED_PRODUCTS','SELECTED_CATEGORIES') then raise exception 'Choose a valid product applicability'; end if;
  if jsonb_typeof(v_product_ids) is distinct from 'array' or jsonb_typeof(v_category_keys) is distinct from 'array' then
    raise exception 'Product and category selections must be lists';
  end if;
  if v_apply_to = 'SELECTED_PRODUCTS' and jsonb_array_length(v_product_ids) = 0 then
    raise exception 'Select at least one product';
  end if;
  if v_apply_to = 'SELECTED_CATEGORIES' and jsonb_array_length(v_category_keys) = 0 then
    raise exception 'Select at least one category';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(v_category_keys) as c(value)
     where c.value not in ('bike','scooter','toto','cushion','accessory')
  ) then raise exception 'A selected category is not supported'; end if;
  if exists (
    select 1 from jsonb_array_elements_text(v_product_ids) as p(value)
     where p.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or not exists (select 1 from public.products x where x.id = p.value::uuid)
  ) then raise exception 'A selected product does not exist'; end if;

  if nullif(p_payload->>'id','') is not null then
    v_id := (p_payload->>'id')::uuid;
    if not exists (select 1 from public.coupons c where c.id = v_id) then
      raise exception 'Coupon no longer exists';
    end if;
  end if;
  if exists (select 1 from public.coupons c where upper(c.code) = v_code and c.id is distinct from v_id) then
    raise exception 'That coupon code already exists';
  end if;

  if v_id is null then
    insert into public.coupons (
      code, discount_type, discount_value, max_discount, minimum_order_value,
      starts_at, expires_at, usage_limit, per_customer_limit, eligibility,
      apply_to, description, is_enabled, created_by
    ) values (
      v_code, v_discount_type, v_discount_value, v_max_discount, v_minimum_order,
      v_starts_at, v_expires_at, v_usage_limit, v_per_customer_limit, v_eligibility,
      v_apply_to, v_description, v_enabled, auth.uid()
    ) returning id into v_id;
  else
    update public.coupons c set
      code = v_code,
      discount_type = v_discount_type,
      discount_value = v_discount_value,
      max_discount = v_max_discount,
      minimum_order_value = v_minimum_order,
      starts_at = v_starts_at,
      expires_at = v_expires_at,
      usage_limit = v_usage_limit,
      per_customer_limit = v_per_customer_limit,
      eligibility = v_eligibility,
      apply_to = v_apply_to,
      description = v_description,
      is_enabled = v_enabled,
      updated_at = now()
    where c.id = v_id;
  end if;

  delete from public.coupon_products where coupon_id = v_id;
  delete from public.coupon_categories where coupon_id = v_id;
  if v_apply_to = 'SELECTED_PRODUCTS' then
    insert into public.coupon_products (coupon_id, product_id)
    select v_id, value::uuid from jsonb_array_elements_text(v_product_ids) as ids(value)
    on conflict do nothing;
  elsif v_apply_to = 'SELECTED_CATEGORIES' then
    insert into public.coupon_categories (coupon_id, category_key)
    select v_id, value from jsonb_array_elements_text(v_category_keys) as keys(value)
    on conflict do nothing;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when p_payload ? 'id' then 'coupon.updated' else 'coupon.created' end,
          'coupon', v_id::text, jsonb_build_object('code', v_code));

  return jsonb_build_object('id', v_id, 'code', v_code);
end;
$$;
revoke all on function public.save_coupon(jsonb) from public, anon;
grant execute on function public.save_coupon(jsonb) to authenticated;

create or replace function public.disable_coupon(p_coupon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  update public.coupons set is_enabled = false, updated_at = now() where id = p_coupon_id;
  if not found then raise exception 'Coupon not found'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'coupon.disabled', 'coupon', p_coupon_id::text);
  return jsonb_build_object('id', p_coupon_id, 'is_enabled', false);
end;
$$;
revoke all on function public.disable_coupon(uuid) from public, anon;
grant execute on function public.disable_coupon(uuid) to authenticated;

create or replace function public.delete_unused_coupon(p_coupon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon public.coupons%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found then raise exception 'Coupon not found'; end if;
  if v_coupon.used_count > 0 or exists (select 1 from public.coupon_usages where coupon_id = p_coupon_id) then
    raise exception 'Coupons with successful usage history cannot be deleted; disable them instead';
  end if;
  delete from public.coupons where id = p_coupon_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'coupon.deleted', 'coupon', p_coupon_id::text);
  return jsonb_build_object('id', p_coupon_id, 'deleted', true);
end;
$$;
revoke all on function public.delete_unused_coupon(uuid) from public, anon;
grant execute on function public.delete_unused_coupon(uuid) to authenticated;

create or replace function public.coupon_analytics(p_coupon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon public.coupons%rowtype;
  v_total_uses bigint;
  v_total_discount numeric(14,2);
  v_rows jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  select * into v_coupon from public.coupons where id = p_coupon_id;
  if not found then raise exception 'Coupon not found'; end if;
  select count(*), coalesce(sum(discount_amount), 0)
    into v_total_uses, v_total_discount
    from public.coupon_usages where coupon_id = p_coupon_id;
  select coalesce(jsonb_agg(to_jsonb(recent_rows)), '[]'::jsonb)
    into v_rows
    from (
      select customer_id, order_id, discount_amount, created_at
        from public.coupon_usages
       where coupon_id = p_coupon_id
       order by created_at desc
       limit 100
    ) as recent_rows;
  return jsonb_build_object(
    'total_uses', v_total_uses,
    'remaining_uses', case when v_coupon.usage_limit is null then null else greatest(0, v_coupon.usage_limit - v_coupon.used_count) end,
    'total_discount_given', v_total_discount,
    'usage_rows', v_rows
  );
end;
$$;
revoke all on function public.coupon_analytics(uuid) from public, anon;
grant execute on function public.coupon_analytics(uuid) to authenticated;

-- This transaction is the final authority for prices, discounts, usage, and order creation.
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
  v_quote jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_item_count integer := 0;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_order_number text;
  v_pickup_token text;
  v_payment_method text;
  v_coupon_code text := nullif(upper(regexp_replace(btrim(coalesce(p_coupon_code,'')), '\s+', '', 'g')), '');
begin
  if v_user_id is null then raise exception 'Authentication is required to place an order'; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 then raise exception 'Enter a valid customer name'; end if;
  if length(trim(coalesce(p_customer_phone,''))) not between 5 and 30 then raise exception 'Enter a valid contact phone number'; end if;
  if length(trim(coalesce(p_vehicle_model,''))) > 120 then raise exception 'Vehicle information is too long'; end if;
  if length(coalesce(p_note,'')) > 500 then raise exception 'Order note is too long'; end if;
  if p_payment_method not in ('PAY_AT_STORE','PAY_ONLINE') then raise exception 'Unsupported payment method'; end if;
  v_payment_method := p_payment_method;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Order items must be an array'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'An order must contain between 1 and 50 items'; end if;

  -- Lock products in a stable order; submitted prices are ignored.
  for v_item in
    select value from jsonb_array_elements(p_items) as input_items(value)
    order by value->>'product_id'
  loop
    v_item_count := v_item_count + 1;
    if coalesce(v_item->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid product'; end if;
    if coalesce(v_item->>'quantity','') !~ '^[1-9][0-9]*$' then raise exception 'Invalid item quantity'; end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then raise exception 'Item quantity exceeds the allowed limit'; end if;
    select * into v_product from public.products p where p.id = v_product_id and p.is_active = true for update;
    if not found or not v_product.in_stock then raise exception 'A selected product is no longer available'; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if v_coupon_code is not null then
    v_quote := public._coupon_quote_for_customer(v_coupon_code, p_items, v_user_id, true);
    if coalesce((v_quote->>'valid')::boolean, false) is not true then
      raise exception '%', coalesce(v_quote->>'message', 'Coupon is invalid or expired.');
    end if;
    v_discount := round((v_quote->>'discount_amount')::numeric)::integer;
    select * into v_coupon from public.coupons c where upper(c.code) = v_coupon_code;
    if not found then raise exception 'Coupon is invalid or expired'; end if;
  end if;
  v_total := greatest(0, v_subtotal - v_discount);

  loop
    v_order_number := 'RGC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.orders o where o.order_number = v_order_number);
  end loop;
  v_pickup_token := upper(encode(extensions.gen_random_bytes(24), 'hex'));

  insert into public.orders (
    order_number, user_id, customer_name, customer_phone, payment_method,
    payment_status, status, subtotal, discount, discount_amount, coupon_id,
    coupon_code, coupon_code_snapshot, vehicle_model, fulfillment_method,
    pickup_store, pickup_note, total
  ) values (
    v_order_number, v_user_id, trim(p_customer_name), trim(p_customer_phone),
    v_payment_method, 'PENDING', 'NEW', v_subtotal, v_discount, v_discount,
    case when v_discount > 0 then v_coupon.id else null end,
    case when v_discount > 0 then v_coupon.code else null end,
    case when v_discount > 0 then v_coupon.code else null end,
    nullif(trim(p_vehicle_model),''), 'STORE_PICKUP', 'ROFIK GODI CENTRE',
    nullif(trim(coalesce(p_note,'')),''), v_total
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) as input_items(value)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products p where p.id = v_product_id;
    insert into public.order_items (order_id, product_id, product_name, color, quantity, unit_price)
    values (v_order.id, v_product.id, v_product.name, left(coalesce(v_item->>'color',''),80), v_quantity, v_product.price);
  end loop;

  if v_discount > 0 then
    insert into public.coupon_usages (coupon_id, customer_id, order_id, discount_amount)
    values (v_coupon.id, v_user_id, v_order.id, v_discount);
    update public.coupons set used_count = used_count + 1, updated_at = now() where id = v_coupon.id;
  end if;

  insert into public.pickup_tokens (order_id, token_hash, expires_at)
  values (v_order.id, encode(extensions.digest(v_pickup_token, 'sha256'), 'hex'), now() + interval '30 days');

  return jsonb_build_object(
    'id', v_order.id, 'order_number', v_order.order_number, 'status', v_order.status,
    'payment_status', v_order.payment_status, 'subtotal', v_order.subtotal,
    'discount', v_order.discount, 'discount_amount', v_order.discount_amount,
    'coupon_code', v_order.coupon_code_snapshot, 'total', v_order.total,
    'created_at', v_order.created_at, 'pickup_token', v_pickup_token
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
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if length(trim(coalesce(p_token,''))) < 20 then raise exception 'Invalid pickup token'; end if;
  select pt.order_id into v_order_id
    from public.pickup_tokens pt
   where pt.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
     and pt.used_at is null and pt.expires_at > now()
   for update;
  if not found then raise exception 'Pickup token is invalid, expired, or already used'; end if;
  update public.orders o set status = 'PICKED_UP', picked_up_at = now()
   where o.id = v_order_id and o.status = 'READY_FOR_PICKUP'
   returning * into v_order;
  if not found then raise exception 'Order is not ready for pickup'; end if;
  update public.pickup_tokens pt set used_at = now() where pt.order_id = v_order_id;
  return jsonb_build_object('order_number', v_order.order_number, 'status', v_order.status, 'picked_up_at', v_order.picked_up_at);
end;
$$;
revoke all on function public.verify_store_pickup_token(text) from public, anon;
grant execute on function public.verify_store_pickup_token(text) to authenticated;
