-- New profile notes are visible to the customer as in-app notifications.
-- Save the admin note and notification atomically; a retry with the same note ID is idempotent.
create or replace function public.admin_add_customer_note_and_notify(
  p_customer_id uuid,
  p_note_id text,
  p_category text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note_id text := btrim(coalesce(p_note_id, ''));
  v_category text := btrim(coalesce(p_category, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_settings jsonb;
  v_customer_notes jsonb;
  v_existing_note jsonb;
  v_note jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required to add customer notes';
  end if;

  if p_customer_id is null or not exists (select 1 from auth.users where id = p_customer_id) then
    raise exception 'The selected customer account no longer exists';
  end if;
  if v_note_id = '' or char_length(v_note_id) > 100 then
    raise exception 'A valid note ID is required';
  end if;
  if v_category not in ('Important', 'Delivery', 'Payment', 'Call', 'General') then
    raise exception 'Unsupported customer note category';
  end if;
  if v_content = '' or char_length(v_content) > 500 then
    raise exception 'Customer note must contain 1 to 500 characters';
  end if;

  -- Serialize appends so concurrent administrators cannot overwrite each other's notes.
  perform pg_advisory_xact_lock(hashtext('admin_customer_notes'), 1);
  select value
    into v_settings
    from public.app_settings
   where key = 'admin_customer_notes'
   for update;
  if not found then
    v_settings := '{}'::jsonb;
  elsif jsonb_typeof(v_settings) is distinct from 'object' then
    raise exception 'Customer note storage has an invalid format';
  end if;

  if jsonb_typeof(v_settings -> p_customer_id::text) = 'array' then
    select existing_note.value
      into v_existing_note
      from jsonb_array_elements(v_settings -> p_customer_id::text) as existing_note(value)
     where existing_note.value ->> 'id' = v_note_id
     limit 1;
    if found then
      return v_existing_note;
    end if;
  end if;

  if jsonb_typeof(v_settings -> p_customer_id::text) = 'array' then
    v_customer_notes := v_settings -> p_customer_id::text;
  else
    v_customer_notes := '[]'::jsonb;
  end if;

  v_now := clock_timestamp();
  v_note := jsonb_build_object(
    'id', v_note_id,
    'category', v_category,
    'content', v_content,
    'createdAt', v_now,
    'author', 'Admin',
    'customerNotifiedAt', v_now
  );
  v_settings := jsonb_set(
    v_settings,
    array[p_customer_id::text],
    v_customer_notes || jsonb_build_array(v_note),
    true
  );

  insert into public.app_settings (key, value, updated_by, updated_at)
  values ('admin_customer_notes', v_settings, auth.uid(), v_now)
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.notifications (user_id, kind, title, body, action_url)
  values (
    p_customer_id,
    'update',
    'Note from Rofik Godi Centre',
    v_content,
    '/notifications'
  );

  return v_note;
end;
$$;

revoke all on function public.admin_add_customer_note_and_notify(uuid, text, text, text) from public, anon;
grant execute on function public.admin_add_customer_note_and_notify(uuid, text, text, text) to authenticated;
