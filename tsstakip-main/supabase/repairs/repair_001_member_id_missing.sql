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
