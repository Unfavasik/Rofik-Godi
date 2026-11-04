-- Stock alerts must work with tracked inventory: a product is "sold out" when
-- in_stock is false OR its tracked stock_quantity has run out, and it is "back
-- in stock" when it becomes sellable again by either route.

-- 1. Allow alerts for products that are sold out via tracked stock.
drop policy if exists stock_alerts_insert_own_out_of_stock on public.stock_alerts;
create policy stock_alerts_insert_own_out_of_stock
  on public.stock_alerts for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.products p
      where p.id = stock_alerts.product_id
        and p.is_active = true
        and (p.in_stock = false or (p.stock_quantity is not null and p.stock_quantity <= 0))
    )
  );

create or replace function public.create_my_stock_alert(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
  v_product public.products%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in required to create a restock alert.';
  end if;
  if p_product_id is null then
    raise exception using errcode = '22023', message = 'A product is required for a restock alert.';
  end if;
  select * into v_product
    from public.products p
    where p.id = p_product_id
    for update;
  if not found or v_product.is_active is distinct from true then
    raise exception using errcode = 'P0002', message = 'This product is no longer available for restock alerts.';
  end if;
  if (v_product.in_stock is distinct from false)
     and (v_product.stock_quantity is null or v_product.stock_quantity > 0) then
    raise exception using errcode = '22023', message = 'This product is already in stock.';
  end if;

  insert into public.stock_alerts (user_id, product_id)
  values (v_user_id, p_product_id)
  on conflict (user_id, product_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

-- 2. Notify subscribers when the product becomes sellable again, whether the
--    restock happened through the in_stock toggle or by raising stock_quantity.
create or replace function public.notify_customers_stock_back_in_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_was_unsellable boolean;
  v_now_sellable boolean;
begin
  v_was_unsellable := old.in_stock is distinct from true
    or (old.stock_quantity is not null and old.stock_quantity <= 0);
  v_now_sellable := new.in_stock = true
    and (new.stock_quantity is null or new.stock_quantity > 0);
  if not (v_was_unsellable and v_now_sellable and new.is_active = true) then
    return new;
  end if;

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
  return new;
end;
$$;

drop trigger if exists products_notify_stock_alerts on public.products;
create trigger products_notify_stock_alerts
  after update of in_stock, is_active, stock_quantity on public.products
  for each row
  when (new.is_active = true)
  execute function public.notify_customers_stock_back_in_stock();
