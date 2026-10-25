-- Route admin support push taps directly to the matching conversation.
create or replace function public.notify_admins_of_support_reply_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.customer_support_requests%rowtype;
  v_customer_name text;
  v_body text;
begin
  if new.is_initial or new.sender_role <> 'customer' then return new; end if;
  select * into v_request from public.customer_support_requests where id = new.request_id;
  if not found then return new; end if;
  select coalesce(nullif(full_name, ''), 'A customer') into v_customer_name from public.profiles where id = new.sender_user_id;
  v_body := left(format('%s (ID %s) replied to %s%s: %s', v_customer_name, right(new.sender_user_id::text, 8), v_request.subject, case when jsonb_array_length(coalesce(new.attachments, '[]'::jsonb)) > 0 then ' with an attachment' else '' end, coalesce(nullif(btrim(new.message), ''), 'Image/file attachment sent')), 500);
  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  select admins.user_id, 'support', 'Customer replied to support request', v_body, '/admin/support/' || new.request_id::text, now() + interval '30 days'
  from public.admin_users admins;
  return new;
end;
$$;
revoke all on function public.notify_admins_of_support_reply_push() from public, anon, authenticated;
