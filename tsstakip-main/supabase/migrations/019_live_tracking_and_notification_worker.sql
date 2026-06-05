alter table public.services
  add column if not exists public_tracking_token text,
  add column if not exists public_tracking_enabled boolean not null default false,
  add column if not exists technician_last_latitude numeric(10, 7),
  add column if not exists technician_last_longitude numeric(10, 7),
  add column if not exists technician_last_seen_at timestamptz,
  add column if not exists technician_eta_minutes integer,
  add column if not exists technician_arrived_at timestamptz;

update public.services
set public_tracking_token = replace(gen_random_uuid()::text, '-', '')
where public_tracking_token is null;

alter table public.services
  alter column public_tracking_token set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists services_public_tracking_token_key
  on public.services(public_tracking_token);

alter table public.notification_deliveries
  add column if not exists processing_attempts integer not null default 0,
  add column if not exists last_attempt_at timestamptz;
