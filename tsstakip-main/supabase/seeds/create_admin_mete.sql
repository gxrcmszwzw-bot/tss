-- Supabase SQL Editor'da calistirmadan once admin_password degerini degistir.
-- Ornek: select 'CokGucluSifre123!'::text as admin_password

with admin_input as (
  select
    'mete@apsiyon.com'::text as admin_email,
    'SIFREYI_BURAYA_YAZ'::text as admin_password,
    'Mete'::text as admin_full_name
),
created_user as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', admin_full_name, 'role', 'admin'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  from admin_input
  where not exists (
    select 1
    from auth.users
    where email = admin_input.admin_email
  )
  returning id, email
),
target_user as (
  select id, email
  from created_user

  union all

  select users.id, users.email
  from auth.users users
  join admin_input on admin_input.admin_email = users.email
  where not exists (select 1 from created_user)
),
created_identity as (
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    target_user.id,
    target_user.id,
    target_user.id::text,
    jsonb_build_object(
      'sub', target_user.id::text,
      'email', target_user.email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  from target_user
  where not exists (
    select 1
    from auth.identities
    where provider = 'email'
      and user_id = target_user.id
  )
  returning user_id
)
insert into public.profiles (
  id,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
select
  target_user.id,
  admin_input.admin_full_name,
  'admin',
  true,
  now(),
  now()
from target_user
cross join admin_input
on conflict (id) do update
set full_name = excluded.full_name,
    role = 'admin',
    is_active = true,
    updated_at = now();
