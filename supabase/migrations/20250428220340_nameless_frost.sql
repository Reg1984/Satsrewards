-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First check if the emails already exist in auth.users
DO $$
DECLARE
  teacher_exists boolean;
  student_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@test.com') INTO teacher_exists;
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@test.com') INTO student_exists;

  -- If the emails exist, update the existing users
  IF teacher_exists THEN
    UPDATE auth.users SET
      encrypted_password = crypt('test123456', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"name":"Test Teacher"}'::jsonb
    WHERE email = 'teacher@test.com';
  ELSE
    -- Insert new teacher user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'teacher@test.com',
      crypt('test123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Test Teacher"}'::jsonb,
      'authenticated',
      'authenticated'
    );
  END IF;

  IF student_exists THEN
    UPDATE auth.users SET
      encrypted_password = crypt('test123456', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"name":"Test Student"}'::jsonb
    WHERE email = 'student@test.com';
  ELSE
    -- Insert new student user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'student@test.com',
      crypt('test123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Test Student"}'::jsonb,
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;

-- Create test school
INSERT INTO schools (
  id,
  name,
  country,
  timezone,
  subscription_status,
  subscription_tier
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Test School',
  'UK',
  'Europe/London',
  'active',
  'free'
) ON CONFLICT DO NOTHING;

-- Update test profiles
UPDATE profiles 
SET 
  school_id = '00000000-0000-0000-0000-000000000003',
  data_retention_approved = true,
  school_system = 'UK',
  primary_language = 'en',
  timezone = 'Europe/London',
  image_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
WHERE email = 'teacher@test.com';

UPDATE profiles 
SET 
  school_id = '00000000-0000-0000-0000-000000000003',
  data_retention_approved = true,
  school_system = 'UK',
  primary_language = 'en',
  timezone = 'Europe/London',
  educational_credits = 1000,
  image_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
WHERE email = 'student@test.com';

-- Ensure student has initial balance
INSERT INTO awards (
  student_id,
  sats,
  reason,
  created_at
) 
SELECT 
  id,
  1000,
  'Initial test balance',
  now()
FROM profiles 
WHERE email = 'student@test.com'
AND NOT EXISTS (
  SELECT 1 FROM awards 
  WHERE student_id = profiles.id 
  AND reason = 'Initial test balance'
);

-- Log the creation of test users
INSERT INTO debug_logs (event_type, details)
VALUES (
  'test_accounts_created',
  jsonb_build_object(
    'teacher_email', 'teacher@test.com',
    'student_email', 'student@test.com',
    'timestamp', now(),
    'description', 'Created test accounts with simple credentials'
  )
);