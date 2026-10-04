-- The legacy order QR trigger searched only public, but pgcrypto is installed in extensions.
-- Qualify the call explicitly so new pickup orders can receive their QR token.
create or replace function public.generate_pickup_order_qr()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.qr_token is null then
    new.qr_token := encode(extensions.gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;
