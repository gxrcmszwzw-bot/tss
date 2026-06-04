alter table public.api_tokens
  add column if not exists token_value text;

create index if not exists api_tokens_token_hash_idx
  on public.api_tokens(token_hash);
