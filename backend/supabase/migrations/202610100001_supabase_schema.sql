-- AIMDS Supabase/PostgreSQL schema
-- The FastAPI service uses the Supabase service-role key. RLS remains enabled
-- so anon/authenticated browser clients cannot bypass the API boundary.

create extension if not exists pgcrypto;

create table if not exists public.aimds_blocks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  name text not null,
  category text not null default 'academic',
  sub_category text,
  location text not null default '',
  description text not null default '',
  status text not null default 'operational',
  commissioned date,
  is_primary boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aimds_floors (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.aimds_blocks(id) on delete cascade,
  code text not null,
  name text not null,
  short text not null default '',
  level integer not null default 0,
  status text not null default 'normal',
  area numeric,
  zones integer,
  occupancy integer,
  utilities jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, code)
);

create table if not exists public.aimds_sensors (
  id uuid primary key default gen_random_uuid(),
  sensor_code text not null unique,
  block_id uuid not null references public.aimds_blocks(id) on delete cascade,
  floor_id uuid references public.aimds_floors(id) on delete cascade,
  floor_code text not null,
  utility_key text not null,
  sensor_type text not null,
  model text not null default '',
  unit text not null default '',
  value numeric,
  status text not null default 'normal',
  battery numeric,
  signal numeric,
  firmware text,
  updated_seconds_ago integer,
  calibrated_on date,
  min_value numeric,
  max_value numeric,
  avg_value numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aimds_alerts (
  id text primary key,
  title text not null,
  severity text not null check (severity in ('critical', 'warning', 'info', 'resolved')),
  status text not null default 'Open',
  acknowledged boolean not null default false,
  block_code text,
  floor_code text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aimds_insights (
  id text primary key,
  kind text not null default 'anomaly',
  severity text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aimds_reports (
  id text primary key,
  name text not null,
  scope text not null,
  period text not null,
  format text not null check (format in ('PDF', 'CSV')),
  generated text not null default 'moments ago',
  size text not null default '—',
  sections jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.aimds_users (
  id text primary key,
  email text not null unique,
  name text not null,
  initials text not null,
  role text not null default 'Operations Engineer',
  picture text,
  auth_provider text not null default 'local' check (auth_provider in ('local', 'google')),
  google_id text unique,
  password_hash text,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists public.aimds_sessions (
  token_hash text primary key,
  user_id text not null references public.aimds_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_blocks_category_status on public.aimds_blocks(category, status);
create index if not exists idx_floors_block_level on public.aimds_floors(block_id, level);
create index if not exists idx_sensors_block_floor on public.aimds_sensors(block_id, floor_id);
create index if not exists idx_sensors_utility_status on public.aimds_sensors(utility_key, status);
create index if not exists idx_alerts_severity_status on public.aimds_alerts(severity, status);
create index if not exists idx_alerts_block_code on public.aimds_alerts(block_code);
create index if not exists idx_insights_kind_severity on public.aimds_insights(kind, severity);
create index if not exists idx_reports_created_at on public.aimds_reports(created_at desc);
create index if not exists idx_sessions_user_expiry on public.aimds_sessions(user_id, expires_at);

-- Keep updated_at deterministic for future mutations.
create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aimds_blocks_set_updated_at on public.aimds_blocks;
create trigger aimds_blocks_set_updated_at before update on public.aimds_blocks for each row execute function public.set_updated_at();
drop trigger if exists aimds_floors_set_updated_at on public.aimds_floors;
create trigger aimds_floors_set_updated_at before update on public.aimds_floors for each row execute function public.set_updated_at();
drop trigger if exists aimds_sensors_set_updated_at on public.aimds_sensors;
create trigger aimds_sensors_set_updated_at before update on public.aimds_sensors for each row execute function public.set_updated_at();
drop trigger if exists aimds_alerts_set_updated_at on public.aimds_alerts;
create trigger aimds_alerts_set_updated_at before update on public.aimds_alerts for each row execute function public.set_updated_at();
drop trigger if exists aimds_insights_set_updated_at on public.aimds_insights;
create trigger aimds_insights_set_updated_at before update on public.aimds_insights for each row execute function public.set_updated_at();

alter table public.aimds_blocks enable row level security;
alter table public.aimds_floors enable row level security;
alter table public.aimds_sensors enable row level security;
alter table public.aimds_alerts enable row level security;
alter table public.aimds_insights enable row level security;
alter table public.aimds_reports enable row level security;
alter table public.aimds_users enable row level security;
alter table public.aimds_sessions enable row level security;

-- No direct browser access. The backend service-role key bypasses RLS after
-- authenticating the request with its own managed session.
drop policy if exists aimds_blocks_backend_only on public.aimds_blocks;
create policy aimds_blocks_backend_only on public.aimds_blocks for all to service_role using (true) with check (true);
drop policy if exists aimds_floors_backend_only on public.aimds_floors;
create policy aimds_floors_backend_only on public.aimds_floors for all to service_role using (true) with check (true);
drop policy if exists aimds_sensors_backend_only on public.aimds_sensors;
create policy aimds_sensors_backend_only on public.aimds_sensors for all to service_role using (true) with check (true);
drop policy if exists aimds_alerts_backend_only on public.aimds_alerts;
create policy aimds_alerts_backend_only on public.aimds_alerts for all to service_role using (true) with check (true);
drop policy if exists aimds_insights_backend_only on public.aimds_insights;
create policy aimds_insights_backend_only on public.aimds_insights for all to service_role using (true) with check (true);
drop policy if exists aimds_reports_backend_only on public.aimds_reports;
create policy aimds_reports_backend_only on public.aimds_reports for all to service_role using (true) with check (true);
drop policy if exists aimds_users_backend_only on public.aimds_users;
create policy aimds_users_backend_only on public.aimds_users for all to service_role using (true) with check (true);
drop policy if exists aimds_sessions_backend_only on public.aimds_sessions;
create policy aimds_sessions_backend_only on public.aimds_sessions for all to service_role using (true) with check (true);
