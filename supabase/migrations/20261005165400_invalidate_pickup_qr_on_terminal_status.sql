-- Consume the one-time code whenever an order leaves the active pickup states,
-- including a manual admin transition that did not originate from a QR scan.
create or replace function public.invalidate_store_pickup_token_on_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('PICKED_UP', 'COMPLETED', 'CANCELLED')
     and old.status is distinct from new.status then
    update public.pickup_tokens
       set used_at = coalesce(used_at, now())
     where order_id = new.id
       and used_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_store_pickup_token_on_terminal_status() from public, anon, authenticated;

drop trigger if exists invalidate_store_pickup_token_on_terminal_status on public.orders;
create trigger invalidate_store_pickup_token_on_terminal_status
after update of status on public.orders
for each row
when (new.status in ('PICKED_UP', 'COMPLETED', 'CANCELLED') and old.status is distinct from new.status)
execute function public.invalidate_store_pickup_token_on_terminal_status();
