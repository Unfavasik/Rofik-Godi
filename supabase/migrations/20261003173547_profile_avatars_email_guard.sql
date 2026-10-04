-- Profile avatars are public to read, but customers can only write inside their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- profiles intentionally has no email column. This guard also prevents a future
-- schema change from allowing clients to mutate an email value through profiles.
create or replace function public.prevent_profile_email_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  new_row jsonb;
  old_row jsonb;
  field_name text;
begin
  new_row := to_jsonb(new);
  if tg_op = 'INSERT' then
    old_row := '{}'::jsonb;
  else
    old_row := to_jsonb(old);
  end if;
  foreach field_name in array array['email', 'email_change'] loop
    if coalesce(new_row ->> field_name, '') is distinct from coalesce(old_row ->> field_name, '') then
      raise exception 'Email cannot be changed through profiles; use Supabase Auth';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.prevent_profile_email_change() from public, anon, authenticated;
drop trigger if exists profiles_prevent_email_change on public.profiles;
create trigger profiles_prevent_email_change
before insert or update on public.profiles
for each row execute function public.prevent_profile_email_change();
