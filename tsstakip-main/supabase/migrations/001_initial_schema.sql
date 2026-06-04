create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_priority as enum ('urgent', 'high', 'normal', 'low');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_status as enum (
    'pending',
    'in_progress',
    'awaiting_approval',
    'approved',
    'completed',
    'canceled',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.team_type as enum ('technical_team', 'subcontractor');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.fee_type as enum ('free', 'paid', 'warranty');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'paid', 'partial');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.photo_type as enum ('start', 'end', 'during');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'member',
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_group_id uuid references public.product_groups(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, product_group_id)
);

create table if not exists public.priority_settings (
  priority public.service_priority primary key,
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_rules (
  id uuid primary key default gen_random_uuid(),
  require_start_photo boolean not null default true,
  require_end_photo boolean not null default true,
  camera_only boolean not null default true,
  gallery_upload_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint only_one_photo_rule_row check (id is not null)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  address text not null,
  district text,
  site_id text not null,
  project_name text,
  product_group_id uuid references public.product_groups(id) on delete set null,
  service_type_id uuid references public.service_types(id) on delete set null,
  member_id uuid references public.profiles(id) on delete set null,
  priority public.service_priority not null default 'normal',
  scheduled_at timestamptz,
  description text,
  status public.service_status not null default 'pending',
  team_type public.team_type not null default 'technical_team',
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  subcontractor_contact text,
  subcontractor_phone text,
  fee_type public.fee_type not null default 'free',
  amount numeric(12, 2),
  currency text not null default 'TRY',
  payment_status public.payment_status,
  warranty_code text,
  warranty_expires_at date,
  started_at timestamptz,
  completed_at timestamptz,
  customer_approval_sent_at timestamptz,
  customer_approved_at timestamptz,
  customer_rejected_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_services_have_amount check (
    fee_type <> 'paid' or (amount is not null and amount > 0)
  ),
  constraint subcontractor_services_have_subcontractor_data check (
    team_type <> 'subcontractor'
    or subcontractor_id is not null
    or subcontractor_contact is not null
  ),
  constraint completed_after_started check (
    completed_at is null or started_at is null or completed_at >= started_at
  )
);

alter table public.services
  add column if not exists member_id uuid references public.profiles(id) on delete set null;

update public.services
set member_id = created_by
where member_id is null
  and created_by is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'assigned_technician_id'
  ) then
    execute '
      update public.services
      set member_id = assigned_technician_id
      where member_id is null
        and assigned_technician_id is not null
    ';
  end if;
end $$;

create table if not exists public.service_photos (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  photo_type public.photo_type not null,
  storage_path text not null unique,
  uploaded_by uuid references public.profiles(id) on delete set null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_active_idx on public.profiles(is_active);
create index if not exists services_scheduled_at_idx on public.services(scheduled_at);
create index if not exists services_status_idx on public.services(status);
create index if not exists services_member_idx on public.services(member_id);
create index if not exists service_photos_service_id_idx
  on public.service_photos(service_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists subcontractors_set_updated_at on public.subcontractors;
create trigger subcontractors_set_updated_at
before update on public.subcontractors
for each row execute function public.set_updated_at();

drop trigger if exists product_groups_set_updated_at on public.product_groups;
create trigger product_groups_set_updated_at
before update on public.product_groups
for each row execute function public.set_updated_at();

drop trigger if exists service_types_set_updated_at on public.service_types;
create trigger service_types_set_updated_at
before update on public.service_types
for each row execute function public.set_updated_at();

drop trigger if exists priority_settings_set_updated_at on public.priority_settings;
create trigger priority_settings_set_updated_at
before update on public.priority_settings
for each row execute function public.set_updated_at();

drop trigger if exists photo_rules_set_updated_at on public.photo_rules;
create trigger photo_rules_set_updated_at
before update on public.photo_rules
for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_service_member(
  service_id uuid,
  user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.services
    where id = service_id
      and member_id = user_id
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'member')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subcontractors enable row level security;
alter table public.product_groups enable row level security;
alter table public.service_types enable row level security;
alter table public.priority_settings enable row level security;
alter table public.photo_rules enable row level security;
alter table public.services enable row level security;
alter table public.service_photos enable row level security;

drop policy if exists "Profiles admin full access" on public.profiles;
create policy "Profiles admin full access"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Profiles users read own" on public.profiles;
create policy "Profiles users read own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Subcontractors admin full access" on public.subcontractors;
create policy "Subcontractors admin full access"
on public.subcontractors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Subcontractors authenticated read active" on public.subcontractors;
create policy "Subcontractors authenticated read active"
on public.subcontractors
for select
to authenticated
using (is_active = true);

drop policy if exists "Product groups admin full access" on public.product_groups;
create policy "Product groups admin full access"
on public.product_groups
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Product groups authenticated read active" on public.product_groups;
create policy "Product groups authenticated read active"
on public.product_groups
for select
to authenticated
using (is_active = true);

drop policy if exists "Service types admin full access" on public.service_types;
create policy "Service types admin full access"
on public.service_types
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Service types authenticated read active" on public.service_types;
create policy "Service types authenticated read active"
on public.service_types
for select
to authenticated
using (is_active = true);

drop policy if exists "Priority settings admin full access" on public.priority_settings;
create policy "Priority settings admin full access"
on public.priority_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Priority settings authenticated read active" on public.priority_settings;
create policy "Priority settings authenticated read active"
on public.priority_settings
for select
to authenticated
using (is_active = true);

drop policy if exists "Photo rules admin full access" on public.photo_rules;
create policy "Photo rules admin full access"
on public.photo_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Photo rules authenticated read" on public.photo_rules;
create policy "Photo rules authenticated read"
on public.photo_rules
for select
to authenticated
using (true);

drop policy if exists "Services admin full access" on public.services;
drop policy if exists "Services technicians read assigned" on public.services;
drop policy if exists "Services technicians update assigned" on public.services;
create policy "Services admin full access"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Services members read own" on public.services;
create policy "Services members read own"
on public.services
for select
to authenticated
using (member_id = auth.uid());

drop policy if exists "Services members create own" on public.services;
create policy "Services members create own"
on public.services
for insert
to authenticated
with check (
  member_id = auth.uid()
  and created_by = auth.uid()
  and status = 'pending'
);

drop policy if exists "Service photos admin full access" on public.service_photos;
drop policy if exists "Service photos technicians read assigned" on public.service_photos;
drop policy if exists "Service photos technicians insert assigned" on public.service_photos;
create policy "Service photos admin full access"
on public.service_photos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

create or replace function public.service_id_from_storage_name(object_name text)
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
  'service-photos',
  'service-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service photo objects admin full access" on storage.objects;
drop policy if exists "Service photo objects technicians read assigned" on storage.objects;
drop policy if exists "Service photo objects technicians upload assigned" on storage.objects;
create policy "Service photo objects admin full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'service-photos' and public.is_admin())
with check (bucket_id = 'service-photos' and public.is_admin());

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

insert into public.priority_settings (priority, label, is_active, sort_order)
values
  ('urgent', 'Acil', true, 10),
  ('high', 'Yüksek', true, 20),
  ('normal', 'Normal', true, 30),
  ('low', 'Düşük', true, 40)
on conflict (priority) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

insert into public.photo_rules (
  id,
  require_start_photo,
  require_end_photo,
  camera_only,
  gallery_upload_enabled
)
values (
  '00000000-0000-0000-0000-000000000001',
  true,
  true,
  true,
  false
)
on conflict (id) do update
set require_start_photo = excluded.require_start_photo,
    require_end_photo = excluded.require_end_photo,
    camera_only = excluded.camera_only,
    gallery_upload_enabled = excluded.gallery_upload_enabled;
