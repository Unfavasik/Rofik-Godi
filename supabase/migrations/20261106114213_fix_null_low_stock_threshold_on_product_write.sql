-- UI and older clients may explicitly send NULL, which bypasses a column
-- DEFAULT. Normalize that value before NOT NULL validation on every write.
alter table public.products
  alter column low_stock_threshold set default 5;

create or replace function public.default_product_low_stock_threshold()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.low_stock_threshold := coalesce(new.low_stock_threshold, 5);
  return new;
end;
$$;
revoke all on function public.default_product_low_stock_threshold() from public, anon, authenticated;

drop trigger if exists products_default_low_stock_threshold on public.products;
create trigger products_default_low_stock_threshold
before insert or update of low_stock_threshold on public.products
for each row
execute function public.default_product_low_stock_threshold();
