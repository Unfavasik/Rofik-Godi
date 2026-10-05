-- Minimal durable idempotency ledger for transactional order-confirmation email.
-- Existing orders and order_items schemas are unchanged.
create table if not exists public.order_confirmation_email_logs (
  order_id uuid primary key references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('processing', 'sent', 'failed', 'skipped')),
  last_error_code text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint order_confirmation_email_sent_at_check
    check ((status = 'sent' and sent_at is not null) or (status <> 'sent' and sent_at is null))
);

alter table public.order_confirmation_email_logs enable row level security;
revoke all on table public.order_confirmation_email_logs from public, anon, authenticated;
grant select, insert, update on table public.order_confirmation_email_logs to service_role;

comment on table public.order_confirmation_email_logs is
  'Server-only delivery/idempotency ledger for one transactional order-confirmation email per order.';
