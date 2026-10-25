-- A resolved support request is read-only for the customer.
-- Admins may still add an internal/workshop reply if needed.
create or replace function public.attach_customer_support_request_files(p_request_id uuid,p_attachments jsonb)
returns integer
language plpgsql security definer set search_path = public, storage, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_request public.customer_support_requests%rowtype;
  v_new_count integer;
  v_existing_count integer;
begin
  if v_user is null then raise exception 'Sign in to upload support attachments'; end if;
  select * into v_request from public.customer_support_requests where id = p_request_id for update;
  if not found then raise exception 'Support request was not found'; end if;
  if v_request.user_id <> v_user and not public.is_admin() then raise exception 'You cannot attach files to this request'; end if;
  if v_request.status = 'resolved' and not public.is_admin() then raise exception 'This support request is resolved and cannot receive more customer files'; end if;
  v_new_count := public.validate_support_attachment_list(p_request_id,p_attachments,v_user);
  select coalesce(sum(jsonb_array_length(attachments)),0)::integer into v_existing_count from public.customer_support_messages where request_id = p_request_id;
  if v_existing_count + v_new_count > 3 then raise exception 'A support request can have at most 3 attachments'; end if;
  update public.customer_support_messages set attachments = attachments || p_attachments where request_id = p_request_id and is_initial;
  if not found then raise exception 'Initial support message was not found'; end if;
  update public.customer_support_requests set last_message_at = now(), updated_at = now() where id = p_request_id;
  return v_new_count;
end;
$$;
revoke all on function public.attach_customer_support_request_files(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.attach_customer_support_request_files(uuid,jsonb) to authenticated;

create or replace function public.add_customer_support_message(p_request_id uuid,p_message text,p_attachments jsonb default '[]'::jsonb)
returns uuid
language plpgsql security definer set search_path = public, storage, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_is_admin boolean;
  v_request public.customer_support_requests%rowtype;
  v_message text := nullif(btrim(p_message), '');
  v_attachments jsonb := coalesce(p_attachments, '[]'::jsonb);
  v_existing_count integer;
  v_new_count integer;
  v_message_id uuid;
begin
  if v_user is null then raise exception 'Sign in to reply to a support request'; end if;
  v_is_admin := public.is_admin();
  select * into v_request from public.customer_support_requests where id = p_request_id for update;
  if not found then raise exception 'Support request was not found'; end if;
  if v_request.user_id <> v_user and not v_is_admin then raise exception 'You cannot reply to this support request'; end if;
  if v_request.status = 'resolved' and not v_is_admin then raise exception 'This support request is resolved and cannot receive customer replies'; end if;
  if v_message is not null and char_length(v_message) > 2000 then raise exception 'Reply must be no more than 2,000 characters'; end if;
  if jsonb_typeof(v_attachments) <> 'array' then raise exception 'Attachments must be a list'; end if;
  v_new_count := public.validate_support_attachment_list(p_request_id,v_attachments,v_user);
  if v_message is null and v_new_count = 0 then raise exception 'Enter a reply or attach a file'; end if;
  select coalesce(sum(jsonb_array_length(attachments)),0)::integer into v_existing_count from public.customer_support_messages where request_id = p_request_id;
  if v_existing_count + v_new_count > 3 then raise exception 'A support request can have at most 3 attachments'; end if;
  insert into public.customer_support_messages(request_id,sender_user_id,sender_role,message,attachments)
  values (p_request_id,v_user,case when v_is_admin then 'admin' else 'customer' end,v_message,v_attachments)
  returning id into v_message_id;
  return v_message_id;
end;
$$;
revoke all on function public.add_customer_support_message(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.add_customer_support_message(uuid,text,jsonb) to authenticated;
