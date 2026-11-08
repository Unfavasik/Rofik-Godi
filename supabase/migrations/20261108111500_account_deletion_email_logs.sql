-- Delivery ledger for account-deletion lifecycle emails.
create table if not exists public.account_deletion_email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in ('scheduled', 'cancelled', 'completed')),
  scheduled_for timestamptz not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event, scheduled_for)
);

create index if not exists account_deletion_email_logs_user_idx
  on public.account_deletion_email_logs (user_id, created_at desc);

alter table public.account_deletion_email_logs enable row level security;
revoke all on public.account_deletion_email_logs from anon, authenticated;
grant select, insert, update on public.account_deletion_email_logs to service_role;
