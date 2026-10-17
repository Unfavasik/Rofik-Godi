create table if not exists public.stock_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint stock_alerts_user_product_key unique (user_id, product_id)
);

create index if not exists stock_alerts_product_idx on public.stock_alerts (product_id, created_at);
alter table public.stock_alerts enable row level security;

drop policy if exists stock_alerts_select_own on public.stock_alerts;
create policy stock_alerts_select_own
  on public.stock_alerts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists stock_alerts_insert_own_out_of_stock on public.stock_alerts;
create policy stock_alerts_insert_own_out_of_stock
  on public.stock_alerts for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.products p
      where p.id = stock_alerts.product_id
        and p.is_active = true
        and p.in_stock = false
    )
  );

drop policy if exists stock_alerts_delete_own on public.stock_alerts;
create policy stock_alerts_delete_own
  on public.stock_alerts for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.stock_alerts to authenticated;

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
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to create a restock alert.';
  end if;
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

  insert into public.stock_alerts (user_id, product_id)
  values (v_user_id, p_product_id)
  on conflict (user_id, product_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.create_my_stock_alert(uuid) from public, anon;
grant execute on function public.create_my_stock_alert(uuid) to authenticated;

create or replace function public.notify_customers_stock_back_in_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (old.in_stock is distinct from new.in_stock or old.is_active is distinct from new.is_active)
     and new.in_stock = true
     and new.is_active = true then
    insert into public.notifications (user_id, kind, title, body, action_url)
    select
      alert.user_id,
      'product',
      'Back in stock: ' || new.name,
      new.name || ' is back in stock. Check availability before it sells out again.',
      '/product/' || new.slug
    from public.stock_alerts alert
    where alert.product_id = new.id;

    delete from public.stock_alerts where product_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_customers_stock_back_in_stock() from public, anon, authenticated;
drop trigger if exists products_notify_stock_alerts on public.products;
create trigger products_notify_stock_alerts
  after update of in_stock, is_active on public.products
  for each row
  when (new.in_stock = true and new.is_active = true)
  execute function public.notify_customers_stock_back_in_stock();
