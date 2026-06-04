do $$
begin
  create type public.photo_inspection_status as enum (
    'pending',
    'processing',
    'approved',
    'needs_correction',
    'manual_review',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.service_photo_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  photo_id uuid not null unique references public.service_photos(id) on delete cascade,
  photo_type public.photo_type not null,
  rubric_code text not null default 'general_installation',
  requested_by uuid references public.profiles(id) on delete set null,
  score smallint check (score between 1 and 5),
  summary text,
  findings jsonb not null default '[]'::jsonb,
  correction_request text,
  status public.photo_inspection_status not null default 'pending',
  processing_error text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_photo_inspections_org_id_idx
  on public.service_photo_inspections(organization_id);
create index if not exists service_photo_inspections_service_id_idx
  on public.service_photo_inspections(service_id);
create index if not exists service_photo_inspections_status_idx
  on public.service_photo_inspections(status, created_at desc);

drop trigger if exists service_photo_inspections_set_updated_at on public.service_photo_inspections;
create trigger service_photo_inspections_set_updated_at
before update on public.service_photo_inspections
for each row execute function public.set_updated_at();

drop trigger if exists service_photo_inspections_audit_log on public.service_photo_inspections;
create trigger service_photo_inspections_audit_log
after insert or update or delete on public.service_photo_inspections
for each row execute function public.write_audit_log();

alter table public.service_photo_inspections enable row level security;

drop policy if exists "Photo inspections admins full access" on public.service_photo_inspections;
create policy "Photo inspections admins full access"
on public.service_photo_inspections
for all
to authenticated
using (public.is_admin() or public.is_organization_admin(organization_id))
with check (public.is_admin() or public.is_organization_admin(organization_id));

drop policy if exists "Photo inspections members read own service" on public.service_photo_inspections;
create policy "Photo inspections members read own service"
on public.service_photo_inspections
for select
to authenticated
using (public.is_service_member(service_id));

drop policy if exists "Photo inspections members insert own service" on public.service_photo_inspections;
create policy "Photo inspections members insert own service"
on public.service_photo_inspections
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.is_service_member(service_id)
);
