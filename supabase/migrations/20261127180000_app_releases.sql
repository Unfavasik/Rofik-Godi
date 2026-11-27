-- Android app update announcements, managed from the admin panel.
create table if not exists public.app_releases (
  id text primary key default 'android' check (id = 'android'),
  version_code integer not null check (version_code > 0),
  version_name text not null,
  min_version_code integer not null default 0 check (min_version_code >= 0),
  apk_url text not null,
  title text not null default 'New update available',
  notes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_releases enable row level security;

drop policy if exists "app_releases_public_read" on public.app_releases;
create policy "app_releases_public_read" on public.app_releases
  for select to anon, authenticated using (true);

drop policy if exists "app_releases_admin_insert" on public.app_releases;
create policy "app_releases_admin_insert" on public.app_releases
  for insert to authenticated with check (public.is_admin());

drop policy if exists "app_releases_admin_update" on public.app_releases;
create policy "app_releases_admin_update" on public.app_releases
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_releases_admin_delete" on public.app_releases;
create policy "app_releases_admin_delete" on public.app_releases
  for delete to authenticated using (public.is_admin());

-- Public bucket that holds the APK files (Supabase free plan allows up to 50 MB per file).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-releases', 'app-releases', true, 52428800, null)
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = null;

drop policy if exists "app_releases_bucket_public_read" on storage.objects;
create policy "app_releases_bucket_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'app-releases');

drop policy if exists "app_releases_bucket_admin_insert" on storage.objects;
create policy "app_releases_bucket_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'app-releases' and public.is_admin());

drop policy if exists "app_releases_bucket_admin_update" on storage.objects;
create policy "app_releases_bucket_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'app-releases' and public.is_admin())
  with check (bucket_id = 'app-releases' and public.is_admin());

drop policy if exists "app_releases_bucket_admin_delete" on storage.objects;
create policy "app_releases_bucket_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'app-releases' and public.is_admin());
