-- Hybrid AI model metadata and inference audit records.
create table if not exists public.aimds_ai_model_runs (
  id uuid primary key default gen_random_uuid(),
  model_version text not null,
  source text not null,
  feature_columns jsonb not null default '[]'::jsonb,
  label_column text,
  metrics jsonb not null default '{}'::jsonb,
  artifact_uri text,
  created_at timestamptz not null default now()
);

create table if not exists public.aimds_ai_predictions (
  id uuid primary key default gen_random_uuid(),
  model_run_id uuid references public.aimds_ai_model_runs(id) on delete set null,
  device_id text,
  reading_timestamp timestamptz,
  anomaly_score numeric,
  anomaly boolean not null default false,
  fault_probability numeric,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_aimds_ai_predictions_device_time
  on public.aimds_ai_predictions(device_id, reading_timestamp desc);
create index if not exists idx_aimds_ai_predictions_risk
  on public.aimds_ai_predictions(risk_level, created_at desc);

alter table public.aimds_ai_model_runs enable row level security;
alter table public.aimds_ai_predictions enable row level security;
drop policy if exists aimds_ai_model_runs_backend_only on public.aimds_ai_model_runs;
create policy aimds_ai_model_runs_backend_only on public.aimds_ai_model_runs for all to service_role using (true) with check (true);
drop policy if exists aimds_ai_predictions_backend_only on public.aimds_ai_predictions;
create policy aimds_ai_predictions_backend_only on public.aimds_ai_predictions for all to service_role using (true) with check (true);
