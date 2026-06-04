create table if not exists public.api_tokens (
  id text primary key,
  name text not null,
  token_hash text not null,
  token_preview text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_tokens enable row level security;

drop trigger if exists api_tokens_set_updated_at on public.api_tokens;
create trigger api_tokens_set_updated_at
before update on public.api_tokens
for each row execute function public.set_updated_at();
