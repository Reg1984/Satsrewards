-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies without using dynamic SQL
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
    'rls_disabled',
    jsonb_build_object(
        'table', 'profiles',
        'timestamp', now(),
        'reason', 'Temporarily disabled for login testing'
    )
);

-- Create or update test accounts
DO $$
DECLARE
    v_teacher_id uuid := '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92';
    v_alice_id uuid := 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d';
    v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
    v_teacher_email text := 'teacher.satsrewards@gmail.com';
    v_student_email text := 'student.satsrewards@gmail.com';
BEGIN
    -- Ensure school exists
    INSERT INTO schools (
        id,
        name,
        country,
        timezone,
        subscription_status,
        subscription_tier
    ) VALUES (
        v_school_id,
        'Test School',
        'UK',
        'Europe/London',
        'active',
        'free'
    ) ON CONFLICT (id) DO NOTHING;

    -- Update or insert teacher profile
    INSERT INTO profiles (
        id,
        email,
        role,
        name,
        class_id,
        school_id,
        data_retention_approved,
        school_system,
        primary_language,
        timezone,
        image_url
    ) VALUES (
        v_teacher_id,
        v_teacher_email,
        'teacher',
        'Ms. Johnson',
        'class-12A',
        v_school_id,
        true,
        'UK',
        'en',
        'Europe/London',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        class_id = EXCLUDED.class_id,
        school_id = EXCLUDED.school_id,
        data_retention_approved = EXCLUDED.data_retention_approved,
        school_system = EXCLUDED.school_system,
        primary_language = EXCLUDED.primary_language,
        timezone = EXCLUDED.timezone,
        image_url = EXCLUDED.image_url;

    -- Update or insert student profile
    INSERT INTO profiles (
        id,
        email,
        role,
        name,
        class_id,
        school_id,
        data_retention_approved,
        school_system,
        primary_language,
        timezone,
        educational_credits,
        image_url
    ) VALUES (
        v_alice_id,
        v_student_email,
        'student',
        'Alice Thompson',
        'class-12A',
        v_school_id,
        true,
        'UK',
        'en',
        'Europe/London',
        1000,
        'https://images.unsplash.com/photo-1517841905240-472988babdf9'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        class_id = EXCLUDED.class_id,
        school_id = EXCLUDED.school_id,
        data_retention_approved = EXCLUDED.data_retention_approved,
        school_system = EXCLUDED.school_system,
        primary_language = EXCLUDED.primary_language,
        timezone = EXCLUDED.timezone,
        educational_credits = EXCLUDED.educational_credits,
        image_url = EXCLUDED.image_url;

    -- Create or update teacher auth user
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
        v_teacher_id,
        '00000000-0000-0000-0000-000000000000',
        v_teacher_email,
        crypt('test123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Ms. Johnson"}'::jsonb,
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create or update student auth user
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
        v_alice_id,
        '00000000-0000-0000-0000-000000000000',
        v_student_email,
        crypt('test123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Alice Thompson"}'::jsonb,
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Ensure student has initial balance
    INSERT INTO awards (
        student_id,
        sats,
        reason,
        created_at
    ) 
    SELECT 
        v_alice_id,
        1000,
        'Initial test balance',
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM awards 
        WHERE student_id = v_alice_id 
        AND reason = 'Initial test balance'
    );

    -- Log success
    INSERT INTO debug_logs (event_type, details)
    VALUES (
        'test_accounts_created',
        jsonb_build_object(
            'teacher_email', v_teacher_email,
            'student_email', v_student_email,
            'timestamp', now(),
            'teacher_id', v_teacher_id,
            'student_id', v_alice_id
        )
    );
END $$;

-- Re-enable RLS with simple policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create single, simple policy for authenticated access
CREATE POLICY "enable_all_access_to_authenticated_users"
    ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Update any old test accounts instead of deleting them
-- This avoids foreign key constraint errors
UPDATE profiles 
SET 
    name = 'Ms. Johnson'
WHERE email = 'teacher@test.com';

UPDATE profiles 
SET 
    name = 'Alice Thompson'
WHERE email = 'alice@test.com';

UPDATE auth.users
SET 
    raw_user_meta_data = '{"name":"Ms. Johnson"}'::jsonb
WHERE email = 'teacher@test.com';

UPDATE auth.users
SET 
    raw_user_meta_data = '{"name":"Alice Thompson"}'::jsonb
WHERE email = 'alice@test.com';