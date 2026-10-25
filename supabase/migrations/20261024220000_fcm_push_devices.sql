create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android' check (platform in ('android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_devices_user_id_idx on public.push_devices(user_id);
alter table public.push_devices enable row level security;

drop policy if exists push_devices_select_own on public.push_devices;
create policy push_devices_select_own on public.push_devices
  for select to authenticated using (user_id = auth.uid());
drop policy if exists push_devices_insert_own on public.push_devices;
create policy push_devices_insert_own on public.push_devices
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists push_devices_update_own on public.push_devices;
create policy push_devices_update_own on public.push_devices
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_devices_delete_own on public.push_devices;
create policy push_devices_delete_own on public.push_devices
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.push_devices to authenticated;
grant all on public.push_devices to service_role;

create table if not exists public.push_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.push_devices(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  last_error_code text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (notification_id, device_id)
);

create index if not exists push_delivery_logs_status_idx on public.push_delivery_logs(status, attempted_at desc);
alter table public.push_delivery_logs enable row level security;
revoke all on public.push_delivery_logs from public, anon, authenticated;
grant all on public.push_delivery_logs to service_role;
