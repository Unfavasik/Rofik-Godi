create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'admin' check (role in ('admin','manager')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public, anon, authenticated;
create policy "admins_read_own_membership" on public.admin_users for select to authenticated using (user_id = auth.uid());

alter table public.products add column if not exists subtitle text;
alter table public.products add column if not exists category_key text check (category_key is null or category_key = any (array['bike','scooter','toto','cushion','accessory']));
alter table public.products add column if not exists additional_images text[] not null default '{}';
alter table public.products add column if not exists features text[] not null default '{}';
alter table public.products add column if not exists materials text[] not null default '{}';
alter table public.products add column if not exists stitch_patterns text[] not null default '{}';
alter table public.products add column if not exists thickness_options jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists colors_json jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists compatibility_list text[] not null default '{}';
alter table public.products add column if not exists badge_color text;
alter table public.products add column if not exists is_bestseller boolean not null default false;
alter table public.products add column if not exists is_new boolean not null default false;
alter table public.products add column if not exists is_waterproof boolean not null default false;
alter table public.products add column if not exists is_customizable boolean not null default false;
alter table public.products add column if not exists in_stock boolean not null default true;
alter table public.products add column if not exists is_featured boolean not null default false;

alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check check (category = any (array['Bike Covers','Scooter Covers','Toto Covers','Cushions','Accessories']));
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method = any (array['COD','UPI','WA','CARD']));
update public.products set category_key = case category when 'Bike Covers' then 'bike' when 'Scooter Covers' then 'scooter' when 'Toto Covers' then 'toto' when 'Cushions' then 'cushion' else 'accessory' end where category_key is null;
update public.products set in_stock = is_active where in_stock is distinct from is_active;

create index if not exists products_active_category_idx on public.products (is_active, category_key);
create index if not exists products_updated_at_idx on public.products (updated_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  public_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_sort_idx on public.product_images (product_id, sort_order);
alter table public.product_images enable row level security;
create policy "product_images_public_read" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));
create policy "product_images_admin_manage" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products_admin_insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products_admin_update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products for delete to authenticated using (public.is_admin());
create policy "orders_admin_read" on public.orders for select to authenticated using (public.is_admin());
create policy "orders_admin_update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders_admin_delete" on public.orders for delete to authenticated using (public.is_admin());
create policy "order_items_admin_read" on public.order_items for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = array['image/webp']::text[];
update storage.buckets set allowed_mime_types = array['image/webp']::text[] where id = 'product-images';
create policy "product_images_bucket_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "product_images_bucket_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_bucket_admin_update" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_bucket_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

create or replace function public.set_products_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_products_updated_at() from public, anon, authenticated;
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_products_updated_at();
