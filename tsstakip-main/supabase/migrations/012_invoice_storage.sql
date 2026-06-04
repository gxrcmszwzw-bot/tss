create or replace function public.service_id_from_invoice_storage_name(object_name text)
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
  'service-invoices',
  'service-invoices',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service invoice objects admins full access" on storage.objects;
create policy "Service invoice objects admins full access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'service-invoices'
  and exists (
    select 1
    from public.services
    where id = public.service_id_from_invoice_storage_name(name)
      and public.is_organization_admin(organization_id)
  )
)
with check (
  bucket_id = 'service-invoices'
  and (storage.foldername(name))[1] = 'invoices'
  and exists (
    select 1
    from public.services
    where id = public.service_id_from_invoice_storage_name(name)
      and public.is_organization_admin(organization_id)
  )
);
