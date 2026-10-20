-- Velxio/AIMDS live telemetry readings.
create table if not exists public.aimds_telemetry_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  voltage numeric,
  current numeric,
  power numeric,
  temperature numeric,
  humidity numeric,
  status text not null default 'online' check (status in ('online', 'offline', 'degraded')),
  connection_status text not null default 'online',
  timestamp timestamptz not null,
  received_at timestamptz not null default now(),
  online boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_aimds_telemetry_device_received
  on public.aimds_telemetry_readings(device_id, received_at desc);
create index if not exists idx_aimds_telemetry_received
  on public.aimds_telemetry_readings(received_at desc);
alter table public.aimds_telemetry_readings enable row level security;
drop policy if exists aimds_telemetry_backend_only on public.aimds_telemetry_readings;
create policy aimds_telemetry_backend_only
  on public.aimds_telemetry_readings
  for all to service_role using (true) with check (true);
