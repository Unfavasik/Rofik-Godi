-- Align the live coupon table with the admin coupon client contract.
alter table public.coupons
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_coupon_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_coupon_updated_at() from public, anon, authenticated;
drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at
before update on public.coupons
for each row execute function public.set_coupon_updated_at();
