alter table public.profiles
  alter column role set default 'member';

update public.profiles
set role = 'member'
where role::text = 'technician';

alter table public.services
  add column if not exists member_id uuid references public.profiles(id) on delete set null;

update public.services
set member_id = created_by
where member_id is null
  and created_by is not null;

drop policy if exists "Services technicians read assigned" on public.services;
drop policy if exists "Services technicians update assigned" on public.services;
drop policy if exists "Service photos technicians read assigned" on public.service_photos;
drop policy if exists "Service photos technicians insert assigned" on public.service_photos;
drop policy if exists "Service photo objects technicians read assigned" on storage.objects;
drop policy if exists "Service photo objects technicians upload assigned" on storage.objects;
drop policy if exists "Profiles users update own basic data" on public.profiles;

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

create index if not exists services_member_idx on public.services(member_id);
drop index if exists public.services_assigned_technician_idx;

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

drop function if exists public.is_assigned_technician(uuid, uuid);

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

alter table public.services
  drop column if exists assigned_technician_id;
