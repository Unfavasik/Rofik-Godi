-- Notify all registered customers once when an enabled coupon expires.
alter table public.coupons
  add column if not exists coupon_expiry_notified_at timestamptz;

create index if not exists coupons_expiry_notification_idx
  on public.coupons (expires_at)
  where is_enabled = true and coupon_expiry_notified_at is null;

create or replace function public.notify_expired_coupons()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_coupon record;
  v_recipients integer;
begin
  for v_coupon in
    select id, code, discount_type, discount_value, expires_at
      from public.coupons
     where is_enabled = true
       and expires_at <= now()
       and coupon_expiry_notified_at is null
     order by expires_at, id
     for update skip locked
  loop
    update public.coupons
       set coupon_expiry_notified_at = now()
     where id = v_coupon.id;

    insert into public.notifications (user_id, kind, title, body, action_url, expires_at)
    select u.id,
           'coupon_expired',
           'Coupon expired: ' || upper(v_coupon.code),
           'The coupon ' || upper(v_coupon.code) || ' has expired and is no longer available. Check the shop for current offers.',
           '/shop',
           now() + interval '30 days'
      from auth.users u;

    get diagnostics v_recipients = row_count;
    v_count := v_count + v_recipients;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.notify_expired_coupons() from public, anon, authenticated;

select cron.unschedule('coupon-expiry-notifications')
where exists (select 1 from cron.job where jobname = 'coupon-expiry-notifications');

select cron.schedule(
  'coupon-expiry-notifications',
  '*/5 * * * *',
  $$select public.notify_expired_coupons();$$
);
