-- Notify all customers or selected customers when an admin publishes a coupon.
-- The browser can only call this after the coupon exists and cannot insert arbitrary
-- notifications directly because this function validates the admin and recipients.
create or replace function public.notify_coupon_audience(
  p_coupon_id uuid,
  p_user_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon public.coupons%rowtype;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to send coupon notifications';
  end if;

  select * into v_coupon
    from public.coupons
   where id = p_coupon_id;
  if not found then
    raise exception 'Coupon not found';
  end if;

  insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
  select u.id,
         'coupon',
         'New offer: ' || upper(v_coupon.code),
         case
           when v_coupon.discount_type = 'PERCENTAGE' then
             'Save ' || trim(to_char(v_coupon.discount_value, 'FM999999990.##')) || '% on your next order with coupon ' || upper(v_coupon.code) || '.'
           else
             'Save ₹' || trim(to_char(v_coupon.discount_value, 'FM999999990.##')) || ' on your next order with coupon ' || upper(v_coupon.code) || '.'
         end,
         '/shop',
         least(v_coupon.expires_at, now() + interval '7 days')
    from auth.users u
   where (p_user_ids is null or u.id = any(p_user_ids))
     and u.id is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.notify_coupon_audience(uuid, uuid[]) from public, anon;
grant execute on function public.notify_coupon_audience(uuid, uuid[]) to authenticated;
