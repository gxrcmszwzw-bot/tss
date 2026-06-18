create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_no text not null,
  contract_type text not null,
  customer_name text not null,
  status text not null default 'draft',
  lifecycle_stage text not null default 'draft',
  primary_site_id uuid references public.customer_sites(id) on delete set null,
  technical_owner_id uuid references public.profiles(id) on delete set null,
  commercial_owner_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  renewal_date date,
  summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contract_no)
);

create table if not exists public.contract_sites (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  site_id uuid not null references public.customer_sites(id) on delete cascade,
  role text not null default 'installation_site',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contract_id, site_id, role)
);

create table if not exists public.contract_modules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  module_key text not null,
  is_enabled boolean not null default true,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, module_key)
);

create table if not exists public.contract_products (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  product_name_snapshot text not null,
  quantity numeric(12, 2) not null default 1,
  unit text,
  requires_installation boolean not null default true,
  is_iot_related boolean not null default false,
  is_service_covered boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name text not null,
  status text not null default 'planned',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  project_manager_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_key text not null,
  status text not null default 'pending',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, phase_key)
);

create table if not exists public.installation_tasks (
  id uuid primary key default gen_random_uuid(),
  project_phase_id uuid not null references public.project_phases(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  title text not null,
  task_type text not null,
  status text not null default 'pending',
  assigned_team text,
  assigned_member_id uuid references public.profiles(id) on delete set null,
  assigned_subcontractor_id uuid references public.subcontractors(id) on delete set null,
  planned_at timestamptz,
  completed_at timestamptz,
  depends_on_task_id uuid references public.installation_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installation_deliverables (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_type text not null,
  status text not null default 'pending',
  delivered_at timestamptz,
  delivered_by uuid references public.profiles(id) on delete set null,
  approval_required boolean not null default false,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.services
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists contract_site_id uuid references public.contract_sites(id) on delete set null;

create index if not exists contracts_org_id_idx
  on public.contracts(organization_id);
create index if not exists contracts_primary_site_id_idx
  on public.contracts(primary_site_id);
create index if not exists contract_sites_contract_id_idx
  on public.contract_sites(contract_id);
create index if not exists contract_sites_site_id_idx
  on public.contract_sites(site_id);
create index if not exists contract_products_contract_id_idx
  on public.contract_products(contract_id);
create index if not exists projects_contract_id_idx
  on public.projects(contract_id);
create index if not exists project_phases_project_id_idx
  on public.project_phases(project_id);
create index if not exists installation_tasks_contract_id_idx
  on public.installation_tasks(contract_id);
create index if not exists installation_tasks_project_phase_id_idx
  on public.installation_tasks(project_phase_id);
create index if not exists installation_tasks_site_id_idx
  on public.installation_tasks(site_id);
create index if not exists installation_deliverables_contract_id_idx
  on public.installation_deliverables(contract_id);
create index if not exists services_contract_id_idx
  on public.services(contract_id);
create index if not exists services_project_id_idx
  on public.services(project_id);
create index if not exists services_contract_site_id_idx
  on public.services(contract_site_id);

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists installation_tasks_set_updated_at on public.installation_tasks;
create trigger installation_tasks_set_updated_at
before update on public.installation_tasks
for each row execute function public.set_updated_at();

drop trigger if exists contracts_audit_log on public.contracts;
create trigger contracts_audit_log
after insert or update or delete on public.contracts
for each row execute function public.write_audit_log();

drop trigger if exists contract_sites_audit_log on public.contract_sites;
create trigger contract_sites_audit_log
after insert or update or delete on public.contract_sites
for each row execute function public.write_audit_log();

drop trigger if exists contract_products_audit_log on public.contract_products;
create trigger contract_products_audit_log
after insert or update or delete on public.contract_products
for each row execute function public.write_audit_log();

drop trigger if exists projects_audit_log on public.projects;
create trigger projects_audit_log
after insert or update or delete on public.projects
for each row execute function public.write_audit_log();

drop trigger if exists installation_tasks_audit_log on public.installation_tasks;
create trigger installation_tasks_audit_log
after insert or update or delete on public.installation_tasks
for each row execute function public.write_audit_log();
