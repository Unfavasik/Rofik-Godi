-- Order totals, option surcharges and saved selections are derived from canonical,
-- locked catalog data. Order and order-history deletion policies remain unchanged.
alter table public.order_items add column if not exists selected_thickness text;
alter table public.order_items add column if not exists selected_stitch text;
alter table public.order_items add column if not exists custom_embroidery_text text;

-- Enforce owner/admin reads at the database boundary. Customer order creation and
-- admin mutations continue through the existing SECURITY DEFINER RPCs.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Remove legacy unrestricted direct writes; customer orders are created only
-- through the validated SECURITY DEFINER RPC. Keep existing admin order DELETE
-- policy untouched so the user's history-deletion test remains available.
drop policy if exists orders_public_insert on public.orders;
drop policy if exists order_items_public_insert on public.order_items;
revoke insert on public.orders from public, anon, authenticated;
revoke insert, update, delete on public.order_items from public, anon, authenticated;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (is_active = true);
grant execute on function public.is_admin() to authenticated;
drop policy if exists products_admin_read on public.products;
create policy products_admin_read on public.products for select to authenticated using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

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

    -- Select option prices and validity exclusively from the locked product row.
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
  end loop;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    -- Reuse the coupon system's server-side eligibility, product/category,
    -- minimum-order, per-customer, expiry and usage-limit checks under lock.
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
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  select public.create_store_pickup_order_v2(p_items, p_customer_name, p_customer_phone, p_vehicle_model, p_note, p_payment_method, p_coupon_code);
$$;
revoke all on function public.create_store_pickup_order(jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_store_pickup_order(jsonb, text, text, text, text, text, text) to authenticated;
revoke all on function public.create_store_pickup_order_v2(jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_store_pickup_order_v2(jsonb, text, text, text, text, text, text) to authenticated;
