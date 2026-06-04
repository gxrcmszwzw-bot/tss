do $$
begin
  create type public.notification_channel as enum ('sms', 'whatsapp');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_delivery_status as enum (
    'pending',
    'processing',
    'sent',
    'failed',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null,
  channel public.notification_channel not null,
  template_name text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_key, channel)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  channel public.notification_channel not null,
  event_key text not null,
  recipient text not null,
  rendered_message text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_delivery_status not null default 'pending',
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_templates_org_event_idx
  on public.notification_templates(organization_id, event_key, channel);
create index if not exists notification_deliveries_org_status_idx
  on public.notification_deliveries(organization_id, status, created_at desc);

drop trigger if exists notification_templates_set_updated_at on public.notification_templates;
create trigger notification_templates_set_updated_at
before update on public.notification_templates
for each row execute function public.set_updated_at();

drop trigger if exists notification_templates_audit_log on public.notification_templates;
create trigger notification_templates_audit_log
after insert or update or delete on public.notification_templates
for each row execute function public.write_audit_log();

drop trigger if exists notification_deliveries_audit_log on public.notification_deliveries;
create trigger notification_deliveries_audit_log
after insert or update or delete on public.notification_deliveries
for each row execute function public.write_audit_log();

alter table public.notification_templates enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Notification templates admins manage own" on public.notification_templates;
create policy "Notification templates admins manage own"
on public.notification_templates
for all
to authenticated
using (public.is_admin() or public.is_organization_admin(organization_id))
with check (public.is_admin() or public.is_organization_admin(organization_id));

drop policy if exists "Notification deliveries admins manage own" on public.notification_deliveries;
create policy "Notification deliveries admins manage own"
on public.notification_deliveries
for all
to authenticated
using (public.is_admin() or public.is_organization_admin(organization_id))
with check (public.is_admin() or public.is_organization_admin(organization_id));
