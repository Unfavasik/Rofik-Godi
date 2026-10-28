-- Preserve the vehicle selected at checkout so admin order details remain stable
-- even if the local vehicle catalog is edited later.
alter table public.orders add column if not exists vehicle_type text;
alter table public.orders add column if not exists vehicle_company text;
alter table public.orders add column if not exists vehicle_image_url text;

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

  -- Reuse the existing server-side validation, pricing, stock, coupon and
  -- payment-draft logic. The snapshot update is in the same transaction.
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
