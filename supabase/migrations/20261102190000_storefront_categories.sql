-- Admin-managed storefront categories: name, image, visibility and ordering.
create table if not exists public.storefront_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null unique check (length(trim(category_key)) between 1 and 60),
  name text not null check (length(trim(name)) between 1 and 80),
  description text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storefront_categories enable row level security;
drop policy if exists "storefront_categories_public_read" on public.storefront_categories;
create policy "storefront_categories_public_read" on public.storefront_categories
  for select to anon, authenticated using (is_active = true or public.is_admin());
drop policy if exists "storefront_categories_admin_insert" on public.storefront_categories;
create policy "storefront_categories_admin_insert" on public.storefront_categories
  for insert to authenticated with check (public.is_admin());
drop policy if exists "storefront_categories_admin_update" on public.storefront_categories;
create policy "storefront_categories_admin_update" on public.storefront_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "storefront_categories_admin_delete" on public.storefront_categories;
create policy "storefront_categories_admin_delete" on public.storefront_categories
  for delete to authenticated using (public.is_admin());

create or replace function public.set_storefront_categories_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists storefront_categories_set_updated_at on public.storefront_categories;
create trigger storefront_categories_set_updated_at
  before update on public.storefront_categories
  for each row execute function public.set_storefront_categories_updated_at();

-- Seed the categories the storefront ships with.
insert into public.storefront_categories (category_key, name, description, sort_order) values
  ('bike', 'Bike Covers', 'Protective covers and bike-fit accessories.', 1),
  ('scooter', 'Scooter Covers', 'Weather-ready covers for scooters.', 2),
  ('toto', 'Toto Covers', 'Covers for toto and e-rickshaw vehicles.', 3),
  ('cushion', 'Cushions', 'Seat cushions and comfort products.', 4),
  ('accessory', 'Accessories', 'Additional products and add-ons.', 5)
on conflict (category_key) do nothing;
