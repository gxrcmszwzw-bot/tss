create table if not exists public.subcontractor_trust_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subcontractor_id uuid not null references public.subcontractors(id) on delete cascade,
  score numeric(5, 2) not null,
  grade text not null,
  service_count integer not null default 0,
  completed_count integer not null default 0,
  on_time_rate numeric(5, 2) not null default 0,
  invoice_match_rate numeric(5, 2) not null default 0,
  budget_adherence_rate numeric(5, 2) not null default 0,
  quality_score numeric(5, 2) not null default 0,
  alert_penalty numeric(5, 2) not null default 0,
  signals jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, subcontractor_id)
);

create index if not exists subcontractor_trust_scores_org_score_idx
  on public.subcontractor_trust_scores(organization_id, score desc);

drop trigger if exists subcontractor_trust_scores_set_updated_at on public.subcontractor_trust_scores;
create trigger subcontractor_trust_scores_set_updated_at
before update on public.subcontractor_trust_scores
for each row execute function public.set_updated_at();

drop trigger if exists subcontractor_trust_scores_audit_log on public.subcontractor_trust_scores;
create trigger subcontractor_trust_scores_audit_log
after insert or update or delete on public.subcontractor_trust_scores
for each row execute function public.write_audit_log();

alter table public.subcontractor_trust_scores enable row level security;

drop policy if exists "Subcontractor trust scores admins manage own" on public.subcontractor_trust_scores;
create policy "Subcontractor trust scores admins manage own"
on public.subcontractor_trust_scores
for all
to authenticated
using (public.is_admin() or public.is_organization_admin(organization_id))
with check (public.is_admin() or public.is_organization_admin(organization_id));

drop policy if exists "Subcontractor trust scores members read own org" on public.subcontractor_trust_scores;
create policy "Subcontractor trust scores members read own org"
on public.subcontractor_trust_scores
for select
to authenticated
using (public.is_organization_member(organization_id));
