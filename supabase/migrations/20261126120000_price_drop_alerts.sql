create table if not exists public.price_drop_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  target_price numeric(10, 2) not null check (target_price > 0),
  initial_price numeric(10, 2) not null check (initial_price > 0),
  triggered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_drop_alerts_user_product_key unique (user_id, product_id)
);

create index if not exists price_drop_alerts_product_active_idx
  on public.price_drop_alerts (product_id, target_price)
  where triggered_at is null;

alter table public.price_drop_alerts enable row level security;

drop policy if exists price_drop_alerts_select_own on public.price_drop_alerts;
create policy price_drop_alerts_select_own
  on public.price_drop_alerts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists price_drop_alerts_insert_own on public.price_drop_alerts;
create policy price_drop_alerts_insert_own
  on public.price_drop_alerts for insert to authenticated
  with check (
    user_id = auth.uid()
    and target_price > 0
    and exists (
      select 1 from public.products p
      where p.id = price_drop_alerts.product_id
        and p.is_active = true
        and p.price > price_drop_alerts.target_price
    )
  );

drop policy if exists price_drop_alerts_update_own on public.price_drop_alerts;
create policy price_drop_alerts_update_own
  on public.price_drop_alerts for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and target_price > 0
  );

drop policy if exists price_drop_alerts_delete_own on public.price_drop_alerts;
create policy price_drop_alerts_delete_own
  on public.price_drop_alerts for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.price_drop_alerts to authenticated;

create or replace function public.list_my_price_drop_alerts()
returns table (
  id uuid,
  product_id uuid,
  product_title text,
  product_image text,
  target_price numeric,
  initial_price numeric,
  triggered_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to view price drop alerts.';
  end if;

  return query
  select
    a.id,
    a.product_id,
    coalesce(p.name, 'Product'),
    p.image_url,
    a.target_price,
    a.initial_price,
    a.triggered_at,
    a.created_at,
    a.updated_at
  from public.price_drop_alerts a
  left join public.products p on p.id = a.product_id
  where a.user_id = v_user_id
  order by a.updated_at desc;
end;
$$;

revoke all on function public.list_my_price_drop_alerts() from public, anon;
grant execute on function public.list_my_price_drop_alerts() to authenticated;

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
  v_row public.price_drop_alerts;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to set a price drop alert.';
  end if;
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

revoke all on function public.upsert_my_price_drop_alert(uuid, numeric) from public, anon;
grant execute on function public.upsert_my_price_drop_alert(uuid, numeric) to authenticated;

create or replace function public.delete_my_price_drop_alert(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to manage price drop alerts.';
  end if;
  if p_product_id is null then
    return false;
  end if;

  delete from public.price_drop_alerts
  where user_id = v_user_id
    and product_id = p_product_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.delete_my_price_drop_alert(uuid) from public, anon;
grant execute on function public.delete_my_price_drop_alert(uuid) to authenticated;

create or replace function public.notify_customers_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active = true
     and old.price is not null
     and new.price < old.price then
    insert into public.notifications (
      user_id,
      kind,
      title,
      body,
      action_url,
      image_url,
      expires_at
    )
    select
      alert.user_id,
      'price_drop',
      'Price Drop Alert: ' || new.name,
      new.name || ' dropped to ₹' || trim(to_char(new.price, 'FM999999990.##')) ||
        ' (below your ₹' || trim(to_char(alert.target_price, 'FM999999990.##')) || ' target).',
      '/shop/products/' || new.id,
      new.image_url,
      now() + interval '14 days'
    from public.price_drop_alerts alert
    where alert.product_id = new.id
      and alert.triggered_at is null
      and new.price < alert.target_price;

    update public.price_drop_alerts
    set triggered_at = now(),
        updated_at = now()
    where product_id = new.id
      and triggered_at is null
      and new.price < target_price;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_customers_price_drop() from public, anon, authenticated;
drop trigger if exists products_notify_price_drop_alerts on public.products;
create trigger products_notify_price_drop_alerts
  after update of price, is_active on public.products
  for each row
  when (new.is_active = true and new.price < old.price)
  execute function public.notify_customers_price_drop();
