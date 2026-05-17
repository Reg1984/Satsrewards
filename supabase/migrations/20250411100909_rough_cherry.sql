-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON profiles;', policyname),
            ' '
        )
        FROM pg_policies
        WHERE tablename = 'profiles'
    );
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
    v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
    v_teacher_exists boolean;
    v_student_exists boolean;
    v_student_id uuid;
    v_existing_teacher_id uuid;
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

    -- Check if teacher exists in auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'teacher@test.com'
    ) INTO v_teacher_exists;

    -- Get existing teacher profile ID if it exists
    SELECT id INTO v_existing_teacher_id FROM profiles WHERE email = 'teacher@test.com';

    -- Create or update teacher auth account
    IF v_teacher_exists THEN
        -- Update existing teacher account
        UPDATE auth.users
        SET 
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Ms. Johnson"}'::jsonb
        WHERE email = 'teacher@test.com';
    ELSE
        -- Create new teacher account
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
            'teacher@test.com',
            crypt('test123456', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Ms. Johnson"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Check if teacher profile exists
    IF v_existing_teacher_id IS NOT NULL THEN
        -- Update existing teacher profile without changing ID
        UPDATE profiles
        SET 
            role = 'teacher',
            name = 'Ms. Johnson',
            class_id = 'class-12A',
            school_id = v_school_id,
            data_retention_approved = true,
            school_system = 'UK',
            primary_language = 'en',
            timezone = 'Europe/London'
        WHERE id = v_existing_teacher_id;
        
        -- Update auth.users to match the existing profile ID
        UPDATE auth.users
        SET id = v_existing_teacher_id
        WHERE email = 'teacher@test.com' AND id != v_existing_teacher_id;
    ELSE
        -- Create new teacher profile
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
            timezone
        ) VALUES (
            v_teacher_id,
            'teacher@test.com',
            'teacher',
            'Ms. Johnson',
            'class-12A',
            v_school_id,
            true,
            'UK',
            'en',
            'Europe/London'
        );
    END IF;
    
    -- Check if student exists in auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'alice@test.com'
    ) INTO v_student_exists;

    -- Get or generate student ID
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'alice@test.com';
    IF v_student_id IS NULL THEN
        v_student_id := gen_random_uuid();
    END IF;

    -- Create or update student auth account
    IF v_student_exists THEN
        -- Update existing student account
        UPDATE auth.users
        SET 
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Alice Thompson"}'::jsonb
        WHERE email = 'alice@test.com';
    ELSE
        -- Create new student account
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
            v_student_id,
            '00000000-0000-0000-0000-000000000000',
            'alice@test.com',
            crypt('test123456', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Alice Thompson"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Check if student profile exists and get its ID
    DECLARE
        v_existing_student_id uuid;
    BEGIN
        SELECT id INTO v_existing_student_id FROM profiles WHERE email = 'alice@test.com';
        
        IF v_existing_student_id IS NOT NULL THEN
            -- Update existing student profile without changing ID
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
                educational_credits = 1000
            WHERE id = v_existing_student_id;
            
            -- Update auth.users to match the existing profile ID
            UPDATE auth.users
            SET id = v_existing_student_id
            WHERE email = 'alice@test.com' AND id != v_existing_student_id;
        ELSE
            -- Create new student profile
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
                educational_credits
            ) VALUES (
                v_student_id,
                'alice@test.com',
                'student',
                'Alice Thompson',
                'class-12A',
                v_school_id,
                true,
                'UK',
                'en',
                'Europe/London',
                1000
            );
        END IF;
    END;

    -- Log success
    INSERT INTO debug_logs (event_type, details)
    VALUES (
        'test_accounts_created',
        jsonb_build_object(
            'teacher_email', 'teacher@test.com',
            'student_email', 'alice@test.com',
            'timestamp', now(),
            'teacher_exists', v_teacher_exists,
            'student_exists', v_student_exists,
            'existing_teacher_id', v_existing_teacher_id
        )
    );
END $$;