-- Keep APK storage restricted to admins and allow the admin panel to replace
-- and remove old APK objects after publishing a new release.
grant execute on function public.is_admin() to authenticated;

drop policy if exists "app_releases_bucket_admin_insert" on storage.objects;
create policy "app_releases_bucket_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'app-releases' and (select public.is_admin()));

drop policy if exists "app_releases_bucket_admin_update" on storage.objects;
create policy "app_releases_bucket_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'app-releases' and (select public.is_admin()))
  with check (bucket_id = 'app-releases' and (select public.is_admin()));

drop policy if exists "app_releases_bucket_admin_delete" on storage.objects;
create policy "app_releases_bucket_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'app-releases' and (select public.is_admin()));
