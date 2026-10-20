-- Computed telemetry fields persisted by the backend normalizer.
alter table public.aimds_telemetry_readings add column if not exists energy numeric;
alter table public.aimds_telemetry_readings add column if not exists cost numeric;
alter table public.aimds_telemetry_readings add column if not exists block_code text;
alter table public.aimds_telemetry_readings add column if not exists floor_code text;
create index if not exists idx_aimds_telemetry_location
  on public.aimds_telemetry_readings(block_code, floor_code, received_at desc);
