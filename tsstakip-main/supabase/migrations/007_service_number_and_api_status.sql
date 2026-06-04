create sequence if not exists public.service_number_seq;

alter table public.services
  add column if not exists service_number text;

with numbered as (
  select
    id,
    created_at,
    row_number() over (order by created_at, id) as rn
  from public.services
  where service_number is null
)
update public.services s
set service_number = 'SRV-' || to_char(numbered.created_at, 'YYYY') || '-' || lpad(numbered.rn::text, 6, '0')
from numbered
where s.id = numbered.id;

do $$
declare
  max_num bigint;
begin
  select coalesce(max((regexp_match(service_number, '([0-9]+)$'))[1]::bigint), 0)
  into max_num
  from public.services
  where service_number is not null;

  perform setval('public.service_number_seq', greatest(max_num, 1), max_num > 0);
end $$;

create or replace function public.set_service_number()
returns trigger
language plpgsql
as $$
begin
  if new.service_number is null or btrim(new.service_number) = '' then
    new.service_number = 'SRV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.service_number_seq')::text, 6, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists services_set_service_number on public.services;
create trigger services_set_service_number
before insert on public.services
for each row execute function public.set_service_number();

alter table public.services
  alter column service_number set not null;

create unique index if not exists services_service_number_key
  on public.services(service_number);
