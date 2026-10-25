-- Include the customer's reply text and attachment metadata in admin activity events.
-- Attachment paths are private storage paths; the admin UI signs them before rendering.
create or replace function public.log_customer_support_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.customer_support_requests%rowtype;
  v_event_type text;
  v_title text;
  v_body text;
begin
  if new.is_initial then return new; end if;
  select * into v_request from public.customer_support_requests where id = new.request_id;
  if not found then return new; end if;

  if new.sender_role = 'admin' then
    v_event_type := 'support_reply_sent';
    v_title := 'Admin replied to support request';
    v_body := 'A workshop team member replied to ' || v_request.subject || '.';
  else
    v_event_type := 'support_request_message_received';
    v_title := 'Customer replied to support request';
    v_body := coalesce((select full_name from public.profiles where id = new.sender_user_id),'A customer') || ' replied to ' || v_request.subject || '.';
  end if;

  insert into public.admin_activity_events(event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details)
  values (
    'support-message:' || new.id,
    v_event_type,
    'support_request',
    new.request_id,
    new.sender_user_id,
    v_request.user_id,
    v_title,
    v_body,
    jsonb_build_object(
      'category', v_request.category,
      'subject', v_request.subject,
      'status', v_request.status,
      'message', coalesce(new.message, ''),
      'attachment_count', jsonb_array_length(coalesce(new.attachments, '[]'::jsonb)),
      'attachments', coalesce(new.attachments, '[]'::jsonb)
    )
  ) on conflict (event_key) do nothing;

  if new.sender_role = 'admin' then
    insert into public.notifications(user_id,kind,title,body,action_url,expires_at)
    values (
      v_request.user_id,
      'update',
      'Workshop replied to your support request',
      left(coalesce(nullif(btrim(new.message), ''), 'A new file was added to your support conversation.'), 180),
      '/support/' || new.request_id::text,
      now() + interval '30 days'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_support_message_activity() from public, anon, authenticated;
