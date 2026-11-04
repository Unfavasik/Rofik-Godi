-- Stock lifecycle: reject orders that exceed tracked stock, decrement stock
-- when an order is confirmed, and alert every user when stock crosses its
-- low-stock threshold (or sells out).

-- 1. Reject order items whose tracked stock cannot cover the quantity.
--    Runs inside the order-creation RPC transaction, so a failure rolls the
--    whole order back. Products without stock_quantity stay untracked.
create or replace function public.guard_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
begin
  if new.product_id is null then
    return new;
  end if;
  select * into v_product from public.products where id = new.product_id;
  if not found or v_product.stock_quantity is null then
    return new; -- creation RPC already validated existence; stock not tracked
  end if;
  if v_product.stock_quantity <= 0 then
    raise exception '% is sold out', v_product.name;
  end if;
  if v_product.stock_quantity < new.quantity then
    raise exception 'Only % left in stock for %', v_product.stock_quantity, v_product.name;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_stock_guard on public.order_items;
create trigger order_items_stock_guard
  before insert on public.order_items
  for each row execute function public.guard_order_item_stock();

-- 2. Decrement tracked stock exactly once, when an order moves NEW -> CONFIRMED.
--    The status machine only allows that transition once per order, so no
--    extra bookkeeping column is needed. When the remaining stock crosses the
--    product's low-stock threshold (or hits zero), every user gets one
--    in-app notification (the push webhook fans these out automatically).
create or replace function public.apply_order_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_old_stock integer;
  v_new_stock integer;
  v_threshold integer;
  v_title text;
  v_body text;
begin
  if new.status <> 'CONFIRMED' or coalesce(old.status, '') <> 'NEW' then
    return new;
  end if;

  for v_item in
    select oi.product_id, oi.quantity, p.name, p.stock_quantity, p.low_stock_threshold
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = new.id
       and p.stock_quantity is not null
       for update of p
  loop
    v_old_stock := v_item.stock_quantity;
    v_new_stock := greatest(0, v_old_stock - v_item.quantity);
    update public.products
       set stock_quantity = v_new_stock
     where id = v_item.product_id;

    v_threshold := coalesce(v_item.low_stock_threshold, 5);
    if v_old_stock > v_threshold and v_new_stock <= v_threshold then
      if v_new_stock <= 0 then
        v_title := 'Sold out: ' || v_item.name;
        v_body := '"' || v_item.name || '" is now sold out. Stay tuned for restocks.';
      else
        v_title := 'Low stock: ' || v_item.name;
        v_body := '"' || v_item.name || '" is running low — only ' || v_new_stock || ' left in stock. Order soon!';
      end if;
      insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
      select pr.id, 'stock', v_title, v_body, '/shop', now() + interval '7 days'
        from public.profiles pr;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_stock_on_confirm on public.orders;
create trigger orders_stock_on_confirm
  after update of status on public.orders
  for each row
  when (new.status = 'CONFIRMED' and old.status = 'NEW')
  execute function public.apply_order_stock_on_confirm();
