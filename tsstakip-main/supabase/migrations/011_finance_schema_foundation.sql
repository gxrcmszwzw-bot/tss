do $$
begin
  create type public.finance_status as enum (
    'not_initialized',
    'awaiting_negotiation',
    'awaiting_invoice',
    'invoice_under_review',
    'approved_for_payout',
    'excluded_from_batch',
    'paid'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.negotiation_status as enum (
    'proposed',
    'accepted',
    'rejected',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invoice_match_status as enum (
    'matched',
    'needs_review',
    'blocked'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payout_batch_status as enum (
    'draft',
    'finalized',
    'paid',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payout_item_status as enum (
    'included',
    'excluded',
    'overridden'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.catalog_price_versions (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  base_price numeric(12, 2) not null check (base_price >= 0),
  currency text not null default 'TRY',
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint catalog_price_versions_window_check check (
    effective_to is null or effective_to > effective_from
  )
);

create table if not exists public.regional_price_multipliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  multiplier numeric(8, 4) not null default 1 check (multiplier > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint regional_price_multipliers_window_check check (
    effective_to is null or effective_to > effective_from
  )
);

alter table public.services
  add column if not exists region_id uuid references public.regions(id) on delete set null,
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null,
  add column if not exists standard_price_snapshot numeric(12, 2),
  add column if not exists regional_multiplier_snapshot numeric(8, 4),
  add column if not exists expected_revenue numeric(12, 2),
  add column if not exists negotiated_cost numeric(12, 2),
  add column if not exists approved_cost numeric(12, 2),
  add column if not exists margin_estimate numeric(12, 2),
  add column if not exists finance_status public.finance_status not null default 'not_initialized',
  add column if not exists finance_closed_at timestamptz;

create table if not exists public.service_negotiations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  initiated_by uuid references public.profiles(id) on delete set null,
  offered_cost numeric(12, 2) not null check (offered_cost >= 0),
  counterparty_note text,
  internal_note text,
  status public.negotiation_status not null default 'proposed',
  created_at timestamptz not null default now()
);

create table if not exists public.service_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  invoice_number text,
  invoice_date date,
  invoice_amount numeric(12, 2) not null check (invoice_amount >= 0),
  currency text not null default 'TRY',
  storage_path text not null unique,
  match_status public.invoice_match_status not null default 'needs_review',
  match_reason text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists public.payout_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_date date not null,
  cutoff_at timestamptz not null,
  status public.payout_batch_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (organization_id, batch_date)
);

create table if not exists public.payout_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payout_batches(id) on delete cascade,
  invoice_id uuid references public.service_invoices(id) on delete set null,
  service_id uuid not null references public.services(id) on delete cascade,
  inclusion_status public.payout_item_status not null default 'included',
  reason_code text,
  override_note text,
  created_at timestamptz not null default now(),
  unique (batch_id, service_id)
);

create table if not exists public.business_calendar (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  rule_type text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, date, rule_type)
);

create index if not exists catalog_items_org_id_idx
  on public.catalog_items(organization_id);
create index if not exists catalog_price_versions_catalog_item_id_idx
  on public.catalog_price_versions(catalog_item_id);
create index if not exists regional_price_multipliers_lookup_idx
  on public.regional_price_multipliers(organization_id, region_id, catalog_item_id);
create index if not exists services_finance_status_idx
  on public.services(finance_status);
create index if not exists services_catalog_item_id_idx
  on public.services(catalog_item_id);
create index if not exists services_region_id_idx
  on public.services(region_id);
create index if not exists service_negotiations_service_id_idx
  on public.service_negotiations(service_id);
create index if not exists service_invoices_service_id_idx
  on public.service_invoices(service_id);
create index if not exists service_invoices_org_status_idx
  on public.service_invoices(organization_id, match_status);
create index if not exists payout_batches_org_date_idx
  on public.payout_batches(organization_id, batch_date);
create index if not exists payout_batch_items_batch_id_idx
  on public.payout_batch_items(batch_id);
create index if not exists business_calendar_org_date_idx
  on public.business_calendar(organization_id, date);

drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists catalog_items_audit_log on public.catalog_items;
create trigger catalog_items_audit_log
after insert or update or delete on public.catalog_items
for each row execute function public.write_audit_log();

drop trigger if exists service_negotiations_audit_log on public.service_negotiations;
create trigger service_negotiations_audit_log
after insert or update or delete on public.service_negotiations
for each row execute function public.write_audit_log();

drop trigger if exists service_invoices_audit_log on public.service_invoices;
create trigger service_invoices_audit_log
after insert or update or delete on public.service_invoices
for each row execute function public.write_audit_log();

drop trigger if exists payout_batches_audit_log on public.payout_batches;
create trigger payout_batches_audit_log
after insert or update or delete on public.payout_batches
for each row execute function public.write_audit_log();

drop trigger if exists payout_batch_items_audit_log on public.payout_batch_items;
create trigger payout_batch_items_audit_log
after insert or update or delete on public.payout_batch_items
for each row execute function public.write_audit_log();

drop trigger if exists business_calendar_audit_log on public.business_calendar;
create trigger business_calendar_audit_log
after insert or update or delete on public.business_calendar
for each row execute function public.write_audit_log();

alter table public.catalog_items enable row level security;
alter table public.catalog_price_versions enable row level security;
alter table public.regional_price_multipliers enable row level security;
alter table public.service_negotiations enable row level security;
alter table public.service_invoices enable row level security;
alter table public.payout_batches enable row level security;
alter table public.payout_batch_items enable row level security;
alter table public.business_calendar enable row level security;

drop policy if exists "Catalog items members read own" on public.catalog_items;
create policy "Catalog items members read own"
on public.catalog_items
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Catalog items admins manage own" on public.catalog_items;
create policy "Catalog items admins manage own"
on public.catalog_items
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Catalog price versions members read own" on public.catalog_price_versions;
create policy "Catalog price versions members read own"
on public.catalog_price_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.catalog_items
    where id = catalog_item_id
      and public.is_organization_member(organization_id)
  )
);

drop policy if exists "Catalog price versions admins manage own" on public.catalog_price_versions;
create policy "Catalog price versions admins manage own"
on public.catalog_price_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.catalog_items
    where id = catalog_item_id
      and public.is_organization_admin(organization_id)
  )
)
with check (
  exists (
    select 1
    from public.catalog_items
    where id = catalog_item_id
      and public.is_organization_admin(organization_id)
  )
);

drop policy if exists "Regional multipliers members read own" on public.regional_price_multipliers;
create policy "Regional multipliers members read own"
on public.regional_price_multipliers
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Regional multipliers admins manage own" on public.regional_price_multipliers;
create policy "Regional multipliers admins manage own"
on public.regional_price_multipliers
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Service negotiations members read own service" on public.service_negotiations;
create policy "Service negotiations members read own service"
on public.service_negotiations
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.is_service_member(service_id)
);

drop policy if exists "Service negotiations admins manage own" on public.service_negotiations;
create policy "Service negotiations admins manage own"
on public.service_negotiations
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Service invoices members read own service" on public.service_invoices;
create policy "Service invoices members read own service"
on public.service_invoices
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.is_service_member(service_id)
);

drop policy if exists "Service invoices admins manage own" on public.service_invoices;
create policy "Service invoices admins manage own"
on public.service_invoices
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Payout batches admins read own" on public.payout_batches;
create policy "Payout batches admins read own"
on public.payout_batches
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "Payout batches admins manage own" on public.payout_batches;
create policy "Payout batches admins manage own"
on public.payout_batches
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Payout batch items admins read own" on public.payout_batch_items;
create policy "Payout batch items admins read own"
on public.payout_batch_items
for select
to authenticated
using (
  exists (
    select 1
    from public.payout_batches
    where id = batch_id
      and public.is_organization_admin(organization_id)
  )
);

drop policy if exists "Payout batch items admins manage own" on public.payout_batch_items;
create policy "Payout batch items admins manage own"
on public.payout_batch_items
for all
to authenticated
using (
  exists (
    select 1
    from public.payout_batches
    where id = batch_id
      and public.is_organization_admin(organization_id)
  )
)
with check (
  exists (
    select 1
    from public.payout_batches
    where id = batch_id
      and public.is_organization_admin(organization_id)
  )
);

drop policy if exists "Business calendar admins read own" on public.business_calendar;
create policy "Business calendar admins read own"
on public.business_calendar
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "Business calendar admins manage own" on public.business_calendar;
create policy "Business calendar admins manage own"
on public.business_calendar
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));
