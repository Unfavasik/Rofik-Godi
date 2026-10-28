create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, phone text, avatar_url text, vehicle_model text, marketing_opt_in boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.profiles enable row level security;
create policy "profiles_read_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_read" on public.profiles for select to authenticated using (public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '')); return new; end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.customer_addresses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, label text not null default 'Home', recipient_name text not null, phone text not null, address_line text not null, city text not null, pincode text not null, is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.customer_addresses enable row level security;
create index if not exists customer_addresses_user_idx on public.customer_addresses (user_id, is_default desc);
create policy "addresses_own_all" on public.customer_addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.wishlists (user_id uuid not null references auth.users(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, product_id));
alter table public.wishlists enable row level security;
create policy "wishlists_own_all" on public.wishlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists discount integer not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists delivery_type text not null default 'home_delivery' check (delivery_type in ('home_delivery','workshop_pickup'));
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists pincode text;
alter table public.orders add column if not exists vehicle_model text;
alter table public.orders add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create policy "orders_customer_read" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "order_items_customer_read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table if not exists public.order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, from_status text, to_status text not null, note text, changed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
alter table public.order_status_history enable row level security;
create policy "order_history_customer_read" on public.order_status_history for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_history_admin_all" on public.order_status_history for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, provider text not null, provider_payment_id text, status text not null default 'created' check (status in ('created','pending','authorized','paid','failed','refunded')), amount integer not null check (amount >= 0), currency text not null default 'INR', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.payments enable row level security;
create policy "payments_customer_read" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "payments_admin_all" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.reviews (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, user_id uuid references auth.users(id) on delete set null, author_name text not null, rating integer not null check (rating between 1 and 5), body text not null, status text not null default 'pending' check (status in ('pending','published','rejected')), verified_purchase boolean not null default false, admin_reply text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.reviews enable row level security;
create index if not exists reviews_product_status_idx on public.reviews (product_id, status, created_at desc);
create policy "reviews_public_published_read" on public.reviews for select to anon, authenticated using (status = 'published');
create policy "reviews_own_insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "reviews_own_read" on public.reviews for select to authenticated using (user_id = auth.uid());
create policy "reviews_admin_all" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.coupons (id uuid primary key default gen_random_uuid(), code text not null unique, discount_type text not null check (discount_type in ('percent','fixed')), discount_value integer not null check (discount_value > 0), minimum_order integer not null default 0 check (minimum_order >= 0), maximum_discount integer, usage_limit integer, usage_count integer not null default 0 check (usage_count >= 0), starts_at timestamptz not null default now(), ends_at timestamptz, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.coupons enable row level security;
create policy "coupons_active_public_read" on public.coupons for select to anon, authenticated using (is_active = true and starts_at <= now() and (ends_at is null or ends_at >= now()));
create policy "coupons_admin_all" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, kind text not null default 'general', title text not null, body text not null, action_url text, read_at timestamptz, created_at timestamptz not null default now());
alter table public.notifications enable row level security;
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create policy "notifications_own_read_update" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_own_mark_read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_admin_insert" on public.notifications for insert to authenticated with check (public.is_admin());

create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
alter table public.audit_logs enable row level security;
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "audit_logs_admin_insert" on public.audit_logs for insert to authenticated with check (public.is_admin());

create table if not exists public.app_settings (key text primary key, value jsonb not null default '{}'::jsonb, updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
create policy "app_settings_admin_all" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_future_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_future_updated_at() from public, anon, authenticated;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_future_updated_at();
drop trigger if exists addresses_set_updated_at on public.customer_addresses;
create trigger addresses_set_updated_at before update on public.customer_addresses for each row execute function public.set_future_updated_at();
drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_future_updated_at();
drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons for each row execute function public.set_future_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_future_updated_at();
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings for each row execute function public.set_future_updated_at();
