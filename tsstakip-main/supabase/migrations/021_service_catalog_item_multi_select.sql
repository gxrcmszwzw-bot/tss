alter table public.services
  add column if not exists catalog_item_ids uuid[] not null default '{}'::uuid[];

update public.services
set catalog_item_ids = case
  when catalog_item_id is null then '{}'::uuid[]
  else array[catalog_item_id]
end
where coalesce(array_length(catalog_item_ids, 1), 0) = 0;

create index if not exists services_catalog_item_ids_idx
  on public.services using gin (catalog_item_ids);
