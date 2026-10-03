-- This project currently has no legacy review rows. Enforce the purchase
-- relationship structurally for all future rows and use the specification's
-- published-by-default behavior; the only customer write path is the RPC.
alter table public.reviews
  alter column customer_id set not null,
  alter column order_id set not null,
  alter column is_published set default true;
