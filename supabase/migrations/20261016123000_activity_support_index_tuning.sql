-- Keep the high-volume activity cursor on the existing covering index instead of duplicating it.
drop index if exists public.admin_activity_events_cursor_idx;

-- Cover the newly introduced support foreign keys and preserve efficient order linkage.
create index if not exists customer_support_messages_sender_user_id_idx
  on public.customer_support_messages (sender_user_id);
create index if not exists customer_support_requests_related_order_id_idx
  on public.customer_support_requests (related_order_id);

-- Evaluate auth.uid() once per statement rather than once per candidate row.
drop policy if exists customer_support_requests_own_read on public.customer_support_requests;
create policy customer_support_requests_own_read
  on public.customer_support_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists customer_support_messages_participant_read on public.customer_support_messages;
create policy customer_support_messages_participant_read
  on public.customer_support_messages for select to authenticated
  using (
    exists (
      select 1 from public.customer_support_requests request
      where request.id = request_id
        and (request.user_id = (select auth.uid()) or public.is_admin())
    )
  );
