-- Allow members to delete photos they uploaded for their own services
-- (admin already has full access via existing policy)

drop policy if exists "Service photos members delete own" on public.service_photos;
create policy "Service photos members delete own"
on public.service_photos
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  and public.is_service_member(service_id)
);

-- Allow members to delete storage objects for their own service uploads
drop policy if exists "Service photo objects members delete own" on storage.objects;
create policy "Service photo objects members delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'services'
  and public.is_service_member(public.service_id_from_storage_name(name))
);
