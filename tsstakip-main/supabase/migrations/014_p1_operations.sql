alter table public.ai_alerts
  add column if not exists resolved_note text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

alter table public.payout_batches
  add column if not exists paid_at timestamptz;
