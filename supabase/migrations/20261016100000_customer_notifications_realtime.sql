-- Publish notification inserts so an authenticated customer with existing row-level access
-- can refresh their in-app inbox and unread badge while the app is open.
do $$
begin
  if not exists (
    select 1
      from pg_publication
     where pubname = 'supabase_realtime'
  ) then
    raise exception 'Expected Supabase Realtime publication is missing.';
  end if;

  if not exists (
    select 1
      from pg_class as relations
      join pg_namespace as schemas on schemas.oid = relations.relnamespace
     where schemas.nspname = 'public'
       and relations.relname = 'notifications'
       and relations.relrowsecurity
  ) then
    raise exception 'Notifications must have row-level security enabled before Realtime is published.';
  end if;

  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
