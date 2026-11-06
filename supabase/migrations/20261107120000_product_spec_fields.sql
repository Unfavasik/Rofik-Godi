-- Editable storefront Specifications fields at the product level.
-- Per-colour overrides live inside colors_json and need no schema change.
alter table public.products add column if not exists package_includes text[] not null default '{}';
alter table public.products add column if not exists installation text;
