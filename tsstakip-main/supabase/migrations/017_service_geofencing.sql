alter table public.services
  add column if not exists service_latitude numeric(10, 7),
  add column if not exists service_longitude numeric(10, 7),
  add column if not exists geofence_radius_meters integer not null default 150;
