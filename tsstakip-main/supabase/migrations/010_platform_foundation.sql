do $$
begin
  create type public.organization_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  reason_code text,
  source text not null default 'database',
  request_id text,
  created_at timestamptz not null default now()
);

alter table public.subcontractors
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.services
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

insert into public.organizations (name, code)
select 'Default Organization', 'default'
where not exists (
  select 1
  from public.organizations
);

with default_org as (
  select id
  from public.organizations
  order by created_at asc, id asc
  limit 1
)
insert into public.organization_members (
  organization_id,
  user_id,
  role,
  is_active
)
select
  default_org.id,
  profiles.id,
  case
    when profiles.role = 'admin' then 'admin'::public.organization_role
    else 'member'::public.organization_role
  end,
  profiles.is_active
from public.profiles
cross join default_org
on conflict (organization_id, user_id) do update
set role = excluded.role,
    is_active = excluded.is_active;

with default_org as (
  select id
  from public.organizations
  order by created_at asc, id asc
  limit 1
)
update public.subcontractors
set organization_id = default_org.id
from default_org
where public.subcontractors.organization_id is null;

with default_org as (
  select id
  from public.organizations
  order by created_at asc, id asc
  limit 1
)
update public.services
set organization_id = default_org.id
from default_org
where public.services.organization_id is null;

alter table public.subcontractors
  alter column organization_id set not null;

alter table public.services
  alter column organization_id set not null;

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);
create index if not exists organization_members_org_id_idx
  on public.organization_members(organization_id);
create index if not exists regions_org_id_idx
  on public.regions(organization_id);
create index if not exists audit_logs_org_id_idx
  on public.audit_logs(organization_id);
create index if not exists audit_logs_entity_idx
  on public.audit_logs(entity_type, entity_id);
create index if not exists subcontractors_org_id_idx
  on public.subcontractors(organization_id);
create index if not exists services_org_id_idx
  on public.services(organization_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

drop trigger if exists regions_set_updated_at on public.regions;
create trigger regions_set_updated_at
before update on public.regions
for each row execute function public.set_updated_at();

create or replace function public.current_user_organization_id(
  target_user_id uuid default auth.uid()
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = target_user_id
    and is_active = true
  order by
    case role
      when 'owner' then 1
      when 'admin' then 2
      else 3
    end,
    created_at asc
  limit 1
$$;

create or replace function public.is_organization_member(
  org_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = target_user_id
      and is_active = true
  );
$$;

create or replace function public.is_organization_admin(
  org_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = target_user_id
      and is_active = true
      and role in ('owner', 'admin')
  )
  or public.is_admin(target_user_id);
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  org_id uuid;
begin
  row_data := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;

  org_id := coalesce(
    nullif(row_data ->> 'organization_id', '')::uuid,
    public.current_user_organization_id()
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  )
  values (
    org_id,
    auth.uid(),
    tg_table_name,
    row_data ->> 'id',
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_audit_log on public.organizations;
create trigger organizations_audit_log
after insert or update or delete on public.organizations
for each row execute function public.write_audit_log();

drop trigger if exists organization_members_audit_log on public.organization_members;
create trigger organization_members_audit_log
after insert or update or delete on public.organization_members
for each row execute function public.write_audit_log();

drop trigger if exists regions_audit_log on public.regions;
create trigger regions_audit_log
after insert or update or delete on public.regions
for each row execute function public.write_audit_log();

drop trigger if exists subcontractors_audit_log on public.subcontractors;
create trigger subcontractors_audit_log
after insert or update or delete on public.subcontractors
for each row execute function public.write_audit_log();

drop trigger if exists services_audit_log on public.services;
create trigger services_audit_log
after insert or update or delete on public.services
for each row execute function public.write_audit_log();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.regions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Organizations members read own" on public.organizations;
create policy "Organizations members read own"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

drop policy if exists "Organizations admins manage own" on public.organizations;
create policy "Organizations admins manage own"
on public.organizations
for all
to authenticated
using (public.is_organization_admin(id))
with check (public.is_organization_admin(id));

drop policy if exists "Organization members read own membership" on public.organization_members;
create policy "Organization members read own membership"
on public.organization_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_organization_admin(organization_id)
);

drop policy if exists "Organization admins manage memberships" on public.organization_members;
create policy "Organization admins manage memberships"
on public.organization_members
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Regions members read own" on public.regions;
create policy "Regions members read own"
on public.regions
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Regions admins manage own" on public.regions;
create policy "Regions admins manage own"
on public.regions
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Audit logs admins read own" on public.audit_logs;
create policy "Audit logs admins read own"
on public.audit_logs
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "Subcontractors admin full access" on public.subcontractors;
create policy "Subcontractors admin full access"
on public.subcontractors
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Subcontractors authenticated read active" on public.subcontractors;
create policy "Subcontractors authenticated read active"
on public.subcontractors
for select
to authenticated
using (
  is_active = true
  and public.is_organization_member(organization_id)
);

drop policy if exists "Services admin full access" on public.services;
create policy "Services admin full access"
on public.services
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (
  public.is_organization_admin(organization_id)
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "Services members read own" on public.services;
create policy "Services members read own"
on public.services
for select
to authenticated
using (
  member_id = auth.uid()
  and public.is_organization_member(organization_id)
);

drop policy if exists "Services members create own" on public.services;
create policy "Services members create own"
on public.services
for insert
to authenticated
with check (
  member_id = auth.uid()
  and created_by = auth.uid()
  and organization_id = public.current_user_organization_id()
  and status in ('pending', 'awaiting_approval')
);

drop policy if exists "Services members update own" on public.services;
create policy "Services members update own"
on public.services
for update
to authenticated
using (
  member_id = auth.uid()
  and public.is_organization_member(organization_id)
)
with check (
  member_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "Service photos members read own service" on public.service_photos;
create policy "Service photos members read own service"
on public.service_photos
for select
to authenticated
using (public.is_service_member(service_id));

drop policy if exists "Service photos members insert own service" on public.service_photos;
create policy "Service photos members insert own service"
on public.service_photos
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_service_member(service_id)
);

drop policy if exists "Service photo objects members read own service" on storage.objects;
create policy "Service photo objects members read own service"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-photos'
  and public.is_service_member(public.service_id_from_storage_name(name))
);

drop policy if exists "Service photo objects members upload own service" on storage.objects;
create policy "Service photo objects members upload own service"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'services'
  and public.is_service_member(public.service_id_from_storage_name(name))
);
