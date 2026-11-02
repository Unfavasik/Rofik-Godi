-- Adds admin-managed URL slug and short description to vehicle models.
alter table public.vehicle_models
  add column if not exists slug text,
  add column if not exists short_description text;

-- Backfill slugs for existing rows from the model name, de-duplicating repeats.
with base as (
  select
    id,
    lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')) as base_slug,
    row_number() over (
      partition by lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
      order by created_at, id
    ) as rn
  from public.vehicle_models
)
update public.vehicle_models as v
set slug = case when base.rn = 1 then base.base_slug else base.base_slug || '-' || base.rn end
from base
where v.id = base.id
  and (v.slug is null or v.slug = '');

-- Slugs are optional; index them for lookups.
create index if not exists vehicle_models_slug_idx
  on public.vehicle_models (slug)
  where slug is not null and slug <> '';

-- The vehicle_models read policy evaluates public.is_admin() for anonymous
-- readers, but migration 202610032220 revoked anon EXECUTE on it, which made
-- every public SELECT fail with "permission denied for function is_admin".
grant execute on function public.is_admin() to anon;
