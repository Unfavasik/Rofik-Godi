-- Keep the products_check invariant (original_price >= price) while
-- normalizing older clients' inconsistent submitted values before validation.
drop trigger if exists products_default_low_stock_threshold on public.products;
drop function if exists public.default_product_low_stock_threshold();

create or replace function public.normalize_product_fields_before_check()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.low_stock_threshold := coalesce(new.low_stock_threshold, 5);
  if new.price is not null then
    new.original_price := greatest(coalesce(new.original_price, new.price), new.price);
  end if;
  return new;
end;
$$;
revoke all on function public.normalize_product_fields_before_check() from public, anon, authenticated;

create trigger products_normalize_fields_before_check
before insert or update of price, original_price, low_stock_threshold on public.products
for each row
execute function public.normalize_product_fields_before_check();
