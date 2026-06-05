alter table public.subcontractors
  add column if not exists city_code text,
  add column if not exists city_name text;

create table if not exists public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_code text not null,
  site_name text,
  customer_name text not null,
  customer_phone text,
  address text,
  city_code text,
  city_name text,
  district_name text,
  project_name text,
  airtable_record_id text,
  source text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, site_code),
  unique (organization_id, airtable_record_id)
);

alter table public.services
  add column if not exists customer_site_id uuid references public.customer_sites(id) on delete set null;

create index if not exists customer_sites_org_site_code_idx
  on public.customer_sites(organization_id, site_code);

create index if not exists customer_sites_org_city_code_idx
  on public.customer_sites(organization_id, city_code);

create index if not exists services_customer_site_id_idx
  on public.services(customer_site_id);

drop trigger if exists customer_sites_set_updated_at on public.customer_sites;
create trigger customer_sites_set_updated_at
before update on public.customer_sites
for each row execute function public.set_updated_at();

drop trigger if exists customer_sites_audit_log on public.customer_sites;
create trigger customer_sites_audit_log
after insert or update or delete on public.customer_sites
for each row execute function public.write_audit_log();

alter table public.customer_sites enable row level security;

drop policy if exists "Customer sites admins manage own" on public.customer_sites;
create policy "Customer sites admins manage own"
on public.customer_sites
for all
to authenticated
using (public.is_admin() or public.is_organization_admin(organization_id))
with check (public.is_admin() or public.is_organization_admin(organization_id));

drop policy if exists "Customer sites members read own" on public.customer_sites;
create policy "Customer sites members read own"
on public.customer_sites
for select
to authenticated
using (public.is_organization_member(organization_id));
