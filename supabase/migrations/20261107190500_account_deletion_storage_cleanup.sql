-- Remove user-owned storage objects as part of scheduled account deletion.
create or replace function public.process_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  v_request record;
  v_count integer := 0;
begin
  for v_request in
    select user_id
      from public.account_deletion_requests
     where status = 'scheduled' and scheduled_for <= now()
     order by scheduled_for
     for update skip locked
  loop
    if exists (select 1 from public.admin_users where user_id = v_request.user_id) then
      update public.account_deletion_requests
         set status = 'cancelled', cancelled_at = now(), updated_at = now()
       where user_id = v_request.user_id;
      continue;
    end if;

    delete from storage.objects
     where bucket_id = 'avatars' and name like v_request.user_id::text || '/%';
    delete from storage.objects
     where bucket_id = 'support-attachments' and name like v_request.user_id::text || '/%';
    delete from public.customer_support_messages where sender_user_id = v_request.user_id;
    delete from public.customer_support_requests where user_id = v_request.user_id;
    delete from public.coupon_usages where customer_id = v_request.user_id;
    delete from public.reviews where user_id = v_request.user_id or customer_id = v_request.user_id;
    delete from public.wishlists where user_id = v_request.user_id;
    delete from public.customer_addresses where user_id = v_request.user_id;
    delete from public.notifications where user_id = v_request.user_id;
    delete from public.push_devices where user_id = v_request.user_id;

    update public.orders
       set customer_name = 'Deleted customer',
           customer_phone = 'Deleted',
           vehicle_model = null,
           vehicle_company = null,
           vehicle_type = null,
           vehicle_image_url = null,
           metadata = '{}'::jsonb,
           coupon_code = null,
           coupon_code_snapshot = null,
           user_id = null
     where user_id = v_request.user_id;

    delete from auth.users where id = v_request.user_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.process_account_deletions() from public, anon, authenticated;
