-- Add idempotency ledgers for order-status and new-account welcome emails.
create table if not exists public.order_status_email_logs (
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text not null check (event_key in (
    'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'CANCELLED', 'PAYMENT_PAID'
  )),
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 20),
  last_error_code text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (order_id, event_key)
);
alter table public.order_status_email_logs enable row level security;
revoke all on table public.order_status_email_logs from public, anon, authenticated;
grant select, insert, update on table public.order_status_email_logs to service_role;

create table if not exists public.welcome_email_logs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 20),
  last_error_code text,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.welcome_email_logs enable row level security;
revoke all on table public.welcome_email_logs from public, anon, authenticated;
grant select, insert, update on table public.welcome_email_logs to service_role;

comment on table public.order_status_email_logs is
  'Server-only idempotency ledger for one customer email per order status or verified payment event.';
comment on table public.welcome_email_logs is
  'Server-only idempotency ledger for one account welcome email per confirmed user.';

-- The existing customer QR stores only one token hash per order and rotates when My Orders
-- is opened. Keep the emailed QR in its own one-time token slot so both codes remain valid.
create table if not exists public.pickup_email_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pickup_email_tokens enable row level security;
revoke all on table public.pickup_email_tokens from public, anon, authenticated;

-- Only a server-side service-role caller may issue the separate ready-email QR.
create or replace function public.issue_ready_pickup_email_token(p_order_number text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_status text;
  v_order_number text := regexp_replace(btrim(coalesce(p_order_number, '')), '^#', '');
  v_token text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Server authorization is required';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'A valid order number is required';
  end if;

  select o.id, o.status
    into v_order_id, v_order_status
    from public.orders o
   where o.order_number = v_order_number
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found or v_order_status <> 'READY_FOR_PICKUP' then
    raise exception 'Pickup QR is available only for a ready store-pickup order';
  end if;

  v_token := upper(encode(extensions.gen_random_bytes(24), 'hex'));
  insert into public.pickup_email_tokens (order_id, token_hash, expires_at, used_at, created_at)
  values (
    v_order_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '30 days',
    null,
    now()
  )
  on conflict (order_id) do update
    set token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        used_at = null,
        created_at = now();

  return v_token;
end;
$$;
revoke all on function public.issue_ready_pickup_email_token(text) from public, anon, authenticated;
grant execute on function public.issue_ready_pickup_email_token(text) to service_role;

-- Admin scanner accepts either the customer's My Orders QR or the email QR. A successful
-- scan still advances READY_FOR_PICKUP -> PICKED_UP -> COMPLETED atomically.
create or replace function public.verify_store_pickup_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_picked_up_at timestamptz := now();
  v_completed_at timestamptz := now();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if length(trim(coalesce(p_token, ''))) < 20 then
    raise exception 'Invalid pickup token';
  end if;

  select pt.order_id
    into v_order_id
    from public.pickup_tokens pt
   where pt.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
     and pt.used_at is null
     and pt.expires_at > now()
   for update;
  if not found then
    select pet.order_id
      into v_order_id
      from public.pickup_email_tokens pet
     where pet.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
       and pet.used_at is null
       and pet.expires_at > now()
     for update;
  end if;
  if not found then
    raise exception 'Pickup token is invalid, expired, or already used';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_order_id
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Store-pickup order not found';
  end if;
  if v_order.status <> 'READY_FOR_PICKUP' then
    raise exception 'Order is not ready for pickup';
  end if;

  update public.orders o
     set status = 'PICKED_UP',
         picked_up_at = coalesce(v_order.picked_up_at, v_picked_up_at)
   where o.id = v_order_id
   returning * into v_order;
  if not found then
    raise exception 'Order pickup could not be recorded';
  end if;

  update public.orders o
     set status = 'COMPLETED',
         completed_at = coalesce(v_order.completed_at, v_completed_at)
   where o.id = v_order_id
   returning * into v_order;
  if not found then
    raise exception 'Order completion could not be recorded';
  end if;

  update public.pickup_tokens pt
     set used_at = coalesce(pt.used_at, v_completed_at)
   where pt.order_id = v_order_id;
  update public.pickup_email_tokens pet
     set used_at = coalesce(pet.used_at, v_completed_at)
   where pet.order_id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'picked_up_at', v_order.picked_up_at,
    'completed_at', v_order.completed_at
  );
end;
$$;
revoke all on function public.verify_store_pickup_token(text) from public, anon, authenticated;
grant execute on function public.verify_store_pickup_token(text) to authenticated;

-- Keep both the customer and email tokens unusable after pickup, completion or cancellation,
-- including status changes made manually by an administrator.
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
    update public.pickup_email_tokens
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
