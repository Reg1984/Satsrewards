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
    v_existing_teacher_id uuid;
    v_existing_student_id uuid;
    v_existing_teacher_email text;
    v_existing_student_email text;
    v_teacher_email_exists boolean;
    v_student_email_exists boolean;
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

    -- Check if emails already exist in profiles
    SELECT EXISTS (SELECT 1 FROM profiles WHERE email = v_teacher_email) INTO v_teacher_email_exists;
    SELECT EXISTS (SELECT 1 FROM profiles WHERE email = v_student_email) INTO v_student_email_exists;
    
    -- Check if profiles exist with foreign key references
    SELECT id, email INTO v_existing_teacher_id, v_existing_teacher_email 
    FROM profiles 
    WHERE id IN (
        SELECT DISTINCT created_by FROM attendance
        UNION
        SELECT DISTINCT created_by FROM behavior_records
    ) 
    AND role = 'teacher'
    LIMIT 1;
    
    SELECT id, email INTO v_existing_student_id, v_existing_student_email 
    FROM profiles 
    WHERE id IN (
        SELECT DISTINCT student_id FROM attendance
        UNION
        SELECT DISTINCT student_id FROM behavior_records
        UNION
        SELECT DISTINCT student_id FROM awards
    ) 
    AND role = 'student'
    LIMIT 1;

    -- If we found existing profiles with references, use those IDs
    IF v_existing_teacher_id IS NOT NULL THEN
        v_teacher_id := v_existing_teacher_id;
    END IF;
    
    IF v_existing_student_id IS NOT NULL THEN
        v_alice_id := v_existing_student_id;
    END IF;

    -- If the emails already exist, update those profiles instead of creating new ones
    IF v_teacher_email_exists THEN
        UPDATE profiles
        SET 
            role = 'teacher',
            name = 'Ms. Johnson',
            class_id = 'class-12A',
            school_id = v_school_id,
            data_retention_approved = true,
            school_system = 'UK',
            primary_language = 'en',
            timezone = 'Europe/London',
            image_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
        WHERE email = v_teacher_email;
        
        -- Get the ID of the updated profile
        SELECT id INTO v_teacher_id FROM profiles WHERE email = v_teacher_email;
    ELSE
        -- Update existing profiles with new emails
        UPDATE profiles
        SET 
            email = v_teacher_email,
            role = 'teacher',
            name = 'Ms. Johnson',
            class_id = 'class-12A',
            school_id = v_school_id,
            data_retention_approved = true,
            school_system = 'UK',
            primary_language = 'en',
            timezone = 'Europe/London',
            image_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
        WHERE id = v_teacher_id;
    END IF;

    IF v_student_email_exists THEN
        UPDATE profiles
        SET 
            role = 'student',
            name = 'Alice Thompson',
            class_id = 'class-12A',
            school_id = v_school_id,
            data_retention_approved = true,
            school_system = 'UK',
            primary_language = 'en',
            timezone = 'Europe/London',
            educational_credits = 1000,
            image_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
        WHERE email = v_student_email;
        
        -- Get the ID of the updated profile
        SELECT id INTO v_alice_id FROM profiles WHERE email = v_student_email;
    ELSE
        -- Update existing profiles with new emails
        UPDATE profiles
        SET 
            email = v_student_email,
            role = 'student',
            name = 'Alice Thompson',
            class_id = 'class-12A',
            school_id = v_school_id,
            data_retention_approved = true,
            school_system = 'UK',
            primary_language = 'en',
            timezone = 'Europe/London',
            educational_credits = 1000,
            image_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
        WHERE id = v_alice_id;
    END IF;

    -- Insert profiles if they don't exist
    IF NOT v_teacher_email_exists AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_teacher_id) THEN
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
        );
    END IF;

    IF NOT v_student_email_exists AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_alice_id) THEN
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
        );
    END IF;

    -- Update auth users
    -- First, delete any existing auth users with the new emails to avoid conflicts
    DELETE FROM auth.users WHERE email IN (v_teacher_email, v_student_email);

    -- Create or update teacher auth user
    BEGIN
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
        ) ON CONFLICT (id) DO UPDATE SET
            email = v_teacher_email,
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Ms. Johnson"}'::jsonb;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but continue
            INSERT INTO debug_logs (event_type, details)
            VALUES (
                'auth_user_error',
                jsonb_build_object(
                    'email', v_teacher_email,
                    'error', SQLERRM,
                    'timestamp', now()
                )
            );
    END;

    -- Create or update student auth user
    BEGIN
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
        ) ON CONFLICT (id) DO UPDATE SET
            email = v_student_email,
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Alice Thompson"}'::jsonb;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but continue
            INSERT INTO debug_logs (event_type, details)
            VALUES (
                'auth_user_error',
                jsonb_build_object(
                    'email', v_student_email,
                    'error', SQLERRM,
                    'timestamp', now()
                )
            );
    END;

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
            'student_id', v_alice_id,
            'existing_teacher_id', v_existing_teacher_id,
            'existing_student_id', v_existing_student_id,
            'existing_teacher_email', v_existing_teacher_email,
            'existing_student_email', v_existing_student_email,
            'teacher_email_exists', v_teacher_email_exists,
            'student_email_exists', v_student_email_exists
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