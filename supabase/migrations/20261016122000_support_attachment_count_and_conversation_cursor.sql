-- Keep ticket attachment quotas and ticket-list ordering accurate across every message page.

alter table public.customer_support_requests
  add column if not exists attachment_count integer not null default 0;

update public.customer_support_requests request
set attachment_count = coalesce((
  select sum(jsonb_array_length(message.attachments))::integer
  from public.customer_support_messages message
  where message.request_id = request.id
), 0)
where request.attachment_count = 0;

alter table public.customer_support_requests
  drop constraint if exists customer_support_requests_attachment_count_check;
alter table public.customer_support_requests
  add constraint customer_support_requests_attachment_count_check
  check (attachment_count between 0 and 3);

create or replace function public.touch_customer_support_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attachment_count integer;
  v_activity_at timestamptz := now();
begin
  select coalesce(sum(jsonb_array_length(message.attachments)), 0)::integer
    into v_attachment_count
  from public.customer_support_messages message
  where message.request_id = new.request_id;

  update public.customer_support_requests
  set attachment_count = v_attachment_count,
      last_message_at = greatest(last_message_at, v_activity_at),
      updated_at = greatest(updated_at, v_activity_at)
  where id = new.request_id;
  return new;
end;
$$;
revoke all on function public.touch_customer_support_request() from public, anon, authenticated;

drop trigger if exists customer_support_messages_touch_request on public.customer_support_messages;
create trigger customer_support_messages_touch_request
  after insert or update of attachments on public.customer_support_messages
  for each row execute function public.touch_customer_support_request();

comment on column public.customer_support_requests.attachment_count is
  'Server-maintained total attachment count across the full support conversation; maximum 3.';
