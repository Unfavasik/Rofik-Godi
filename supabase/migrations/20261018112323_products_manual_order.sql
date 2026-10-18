alter table public.products
  add column if not exists display_order integer;

with ranked_products as (
  select id, row_number() over (order by updated_at desc, id asc)::integer - 1 as display_order
  from public.products
)
update public.products as product
set display_order = ranked_products.display_order
from ranked_products
where product.id = ranked_products.id
  and product.display_order is null;

alter table public.products
  alter column display_order set default 0,
  alter column display_order set not null;

create index if not exists products_active_display_order_idx
  on public.products (is_active, display_order);

create or replace function public.reorder_products(p_product_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  product_count bigint;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required to reorder products' using errcode = '42501';
  end if;

  if p_product_ids is null then
    raise exception 'A complete product order is required' using errcode = '22023';
  end if;

  if cardinality(p_product_ids) <> (select count(distinct product_id) from unnest(p_product_ids) as submitted(product_id)) then
    raise exception 'Product order cannot contain duplicate IDs' using errcode = '22023';
  end if;

  select count(*) into product_count from public.products;
  if cardinality(p_product_ids) <> product_count then
    raise exception 'Product order must include every catalog product' using errcode = '22023';
  end if;

  update public.products as product
  set display_order = ordered.ordinality::integer - 1
  from unnest(p_product_ids) with ordinality as ordered(product_id, ordinality)
  where product.id = ordered.product_id;
end;
$$;

revoke all on function public.reorder_products(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_products(uuid[]) to authenticated;
