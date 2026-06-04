-- Ensure the service-photos bucket exists and is public so the app's
-- /storage/v1/object/public/... URLs render in <img> tags.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-photos',
  'service-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
