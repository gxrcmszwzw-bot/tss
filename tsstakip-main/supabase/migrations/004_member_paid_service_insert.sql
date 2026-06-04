-- Allow members to create paid services (status = 'awaiting_approval')
-- The previous policy only allowed 'pending' which broke the paid service flow.

drop policy if exists "Services members create own" on public.services;
create policy "Services members create own"
on public.services
for insert
to authenticated
with check (
  member_id = auth.uid()
  and created_by = auth.uid()
  and status in ('pending', 'awaiting_approval')
);

-- Also allow members to update some fields on their own services
-- (e.g. mark as in_progress, completed, edit description before scheduling)
drop policy if exists "Services members update own" on public.services;
create policy "Services members update own"
on public.services
for update
to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid());
