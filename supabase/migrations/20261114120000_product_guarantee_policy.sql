-- Store-wide product guarantee policy (configured by admin for all products)
-- plus optional per-product guarantee expiry override.
alter table public.products
  add column if not exists guarantee_valid_until date;

drop function if exists public.get_product_guarantee_policy();

create or replace function public.get_product_guarantee_policy()
returns table (
  enabled boolean,
  mode text,
  valid_until_date text,
  duration_months integer,
  updated_at text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((settings.value ->> 'enabled')::boolean, true) as enabled,
    coalesce(nullif(btrim(settings.value ->> 'mode'), ''), 'duration_months') as mode,
    nullif(btrim(coalesce(settings.value ->> 'validUntilDate', settings.value ->> 'valid_until_date')), '') as valid_until_date,
    coalesce((settings.value ->> 'durationMonths')::integer, (settings.value ->> 'duration_months')::integer, 12) as duration_months,
    nullif(btrim(coalesce(settings.value ->> 'updatedAt', settings.value ->> 'updated_at')), '') as updated_at
  from public.app_settings as settings
  where settings.key = 'product_guarantee_policy'
  limit 1;
$$;

revoke all on function public.get_product_guarantee_policy() from public, anon, authenticated;
grant execute on function public.get_product_guarantee_policy() to anon, authenticated;
