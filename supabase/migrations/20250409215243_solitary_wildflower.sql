-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create test users in auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_super_admin
) VALUES 
-- Teacher
(
  '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92',
  '00000000-0000-0000-0000-000000000000',
  'teacher@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Ms. Johnson"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  null,
  null,
  null,
  false
),
-- Alice
(
  'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
  '00000000-0000-0000-0000-000000000000',
  'alice@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Alice Thompson"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  null,
  null,
  null,
  false
),
-- Bob
(
  'b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e',
  '00000000-0000-0000-0000-000000000000',
  'bob@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Bob Wilson"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  null,
  null,
  null,
  false
),
-- Charlie
(
  'c3d4e5f6-a7b8-6c9d-0e1f-2a3b4c5d6e7f',
  '00000000-0000-0000-0000-000000000000',
  'charlie@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Charlie Brown"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  null,
  null,
  null,
  false
),
-- Diana
(
  'd4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f89',
  '00000000-0000-0000-0000-000000000000',
  'diana@test.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Diana Martinez"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  null,
  null,
  null,
  false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  email_confirmed_at = EXCLUDED.email_confirmed_at;