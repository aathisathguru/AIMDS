-- AIMDS SMS notification settings and auditable delivery history.
create table if not exists public.aimds_notification_settings (
  user_id text primary key references public.aimds_users(id) on delete cascade,
  mobile_number text,
  sms_enabled boolean not null default false,
  sms_critical boolean not null default true,
  sms_warning boolean not null default true,
  sms_info boolean not null default false,
  cooldown_seconds integer not null default 900 check (cooldown_seconds between 60 and 86400),
  updated_at timestamptz not null default now()
);

create table if not exists public.aimds_sms_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.aimds_users(id) on delete cascade,
  alert_id text not null,
  trigger_key text not null,
  alert_type text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  detected_value text,
  unit text,
  occurred_at timestamptz not null,
  to_number text not null,
  status text not null check (status in ('submitted', 'sent', 'failed', 'not_configured')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_aimds_sms_delivery_user_created
  on public.aimds_sms_deliveries(user_id, created_at desc);
create index if not exists idx_aimds_sms_delivery_dedupe
  on public.aimds_sms_deliveries(user_id, trigger_key, created_at desc);

alter table public.aimds_notification_settings enable row level security;
alter table public.aimds_sms_deliveries enable row level security;
drop policy if exists aimds_notification_settings_backend_only on public.aimds_notification_settings;
create policy aimds_notification_settings_backend_only
  on public.aimds_notification_settings for all to service_role using (true) with check (true);
drop policy if exists aimds_sms_deliveries_backend_only on public.aimds_sms_deliveries;
create policy aimds_sms_deliveries_backend_only
  on public.aimds_sms_deliveries for all to service_role using (true) with check (true);
