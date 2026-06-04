do $$
begin
  create type public.ai_job_status as enum (
    'pending',
    'processing',
    'completed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ai_risk_level as enum (
    'low',
    'medium',
    'high'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.service_voice_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null unique,
  transcript text,
  summary text,
  risk_level public.ai_risk_level not null default 'low',
  risk_flags jsonb not null default '[]'::jsonb,
  processing_status public.ai_job_status not null default 'pending',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  voice_note_id uuid references public.service_voice_notes(id) on delete cascade,
  title text not null,
  detail text,
  risk_level public.ai_risk_level not null default 'medium',
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists service_voice_notes_service_id_idx
  on public.service_voice_notes(service_id);
create index if not exists service_voice_notes_org_status_idx
  on public.service_voice_notes(organization_id, processing_status);
create index if not exists ai_alerts_org_risk_idx
  on public.ai_alerts(organization_id, risk_level, is_resolved);

drop trigger if exists service_voice_notes_set_updated_at on public.service_voice_notes;
create trigger service_voice_notes_set_updated_at
before update on public.service_voice_notes
for each row execute function public.set_updated_at();

drop trigger if exists service_voice_notes_audit_log on public.service_voice_notes;
create trigger service_voice_notes_audit_log
after insert or update or delete on public.service_voice_notes
for each row execute function public.write_audit_log();

drop trigger if exists ai_alerts_audit_log on public.ai_alerts;
create trigger ai_alerts_audit_log
after insert or update or delete on public.ai_alerts
for each row execute function public.write_audit_log();

alter table public.service_voice_notes enable row level security;
alter table public.ai_alerts enable row level security;

drop policy if exists "Service voice notes members read own service" on public.service_voice_notes;
create policy "Service voice notes members read own service"
on public.service_voice_notes
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.is_service_member(service_id)
);

drop policy if exists "Service voice notes members insert own service" on public.service_voice_notes;
create policy "Service voice notes members insert own service"
on public.service_voice_notes
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_organization_member(organization_id)
  and public.is_service_member(service_id)
);

drop policy if exists "Service voice notes admins manage own" on public.service_voice_notes;
create policy "Service voice notes admins manage own"
on public.service_voice_notes
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "AI alerts admins read own" on public.ai_alerts;
create policy "AI alerts admins read own"
on public.ai_alerts
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "AI alerts admins manage own" on public.ai_alerts;
create policy "AI alerts admins manage own"
on public.ai_alerts
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create or replace function public.service_id_from_voice_note_storage_name(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  parsed_service_id uuid;
begin
  parsed_service_id := ((storage.foldername(object_name))[2])::uuid;
  return parsed_service_id;
exception
  when others then
    return null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-voice-notes',
  'service-voice-notes',
  false,
  26214400,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service voice note objects members upload own service" on storage.objects;
create policy "Service voice note objects members upload own service"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-voice-notes'
  and (storage.foldername(name))[1] = 'voice-notes'
  and public.is_service_member(public.service_id_from_voice_note_storage_name(name))
);

drop policy if exists "Service voice note objects members read own service" on storage.objects;
create policy "Service voice note objects members read own service"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-voice-notes'
  and public.is_service_member(public.service_id_from_voice_note_storage_name(name))
);

drop policy if exists "Service voice note objects admins full access" on storage.objects;
create policy "Service voice note objects admins full access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'service-voice-notes'
  and exists (
    select 1
    from public.services
    where id = public.service_id_from_voice_note_storage_name(name)
      and public.is_organization_admin(organization_id)
  )
)
with check (
  bucket_id = 'service-voice-notes'
  and (storage.foldername(name))[1] = 'voice-notes'
  and exists (
    select 1
    from public.services
    where id = public.service_id_from_voice_note_storage_name(name)
      and public.is_organization_admin(organization_id)
  )
);
