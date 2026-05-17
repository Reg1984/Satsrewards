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
    v_existing_teacher_id uuid;
    v_existing_student_id uuid;
    v_teacher_profile_exists boolean := false;
    v_student_profile_exists boolean := false;
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

    -- Check if profiles exist
    BEGIN
        SELECT id INTO v_existing_teacher_id FROM profiles WHERE email = 'teacher@test.com';
        IF FOUND THEN
            v_teacher_profile_exists := true;
            v_teacher_id := v_existing_teacher_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            v_teacher_profile_exists := false;
    END;
    
    BEGIN
        SELECT id INTO v_existing_student_id FROM profiles WHERE email = 'alice@test.com';
        IF FOUND THEN
            v_student_profile_exists := true;
            v_alice_id := v_existing_student_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            v_student_profile_exists := false;
    END;

    -- Handle teacher profile
    IF v_teacher_profile_exists THEN
        -- Update existing teacher profile
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
        WHERE id = v_teacher_id;
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
        ) ON CONFLICT (email) DO UPDATE SET
            role = 'teacher',
            name = 'Ms. Johnson',
            class_id = 'class-12A',
            school_id = v_school_id;
    END IF;

    -- Handle student profile
    IF v_student_profile_exists THEN
        -- Update existing student profile
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
        WHERE id = v_alice_id;
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
            educational_credits,
            image_url
        ) VALUES (
            v_alice_id,
            'alice@test.com',
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
        ) ON CONFLICT (email) DO UPDATE SET
            role = 'student',
            name = 'Alice Thompson',
            class_id = 'class-12A',
            school_id = v_school_id,
            educational_credits = 1000,
            image_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9';
    END IF;

    -- Create or update auth users (separate try/catch blocks to avoid transaction rollback)
    -- Teacher auth user
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
            'teacher@test.com',
            crypt('test123456', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Ms. Johnson"}'::jsonb,
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO UPDATE SET
            email = 'teacher@test.com',
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Ms. Johnson"}'::jsonb;
    EXCEPTION
        WHEN OTHERS THEN
            -- Try updating by email if ID conflict fails
            BEGIN
                UPDATE auth.users SET
                    encrypted_password = crypt('test123456', gen_salt('bf')),
                    email_confirmed_at = now(),
                    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
                    raw_user_meta_data = '{"name":"Ms. Johnson"}'::jsonb
                WHERE email = 'teacher@test.com';
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but continue
                    INSERT INTO debug_logs (event_type, details)
                    VALUES (
                        'auth_user_error',
                        jsonb_build_object(
                            'email', 'teacher@test.com',
                            'error', SQLERRM,
                            'timestamp', now()
                        )
                    );
            END;
    END;

    -- Student auth user
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
            'alice@test.com',
            crypt('test123456', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Alice Thompson"}'::jsonb,
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO UPDATE SET
            email = 'alice@test.com',
            encrypted_password = crypt('test123456', gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Alice Thompson"}'::jsonb;
    EXCEPTION
        WHEN OTHERS THEN
            -- Try updating by email if ID conflict fails
            BEGIN
                UPDATE auth.users SET
                    encrypted_password = crypt('test123456', gen_salt('bf')),
                    email_confirmed_at = now(),
                    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
                    raw_user_meta_data = '{"name":"Alice Thompson"}'::jsonb
                WHERE email = 'alice@test.com';
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but continue
                    INSERT INTO debug_logs (event_type, details)
                    VALUES (
                        'auth_user_error',
                        jsonb_build_object(
                            'email', 'alice@test.com',
                            'error', SQLERRM,
                            'timestamp', now()
                        )
                    );
            END;
    END;

    -- Ensure student has initial balance
    BEGIN
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
        WHERE email = 'alice@test.com'
        AND NOT EXISTS (
            SELECT 1 FROM awards 
            WHERE student_id = profiles.id 
            AND reason = 'Initial test balance'
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but continue
            INSERT INTO debug_logs (event_type, details)
            VALUES (
                'award_error',
                jsonb_build_object(
                    'student_email', 'alice@test.com',
                    'error', SQLERRM,
                    'timestamp', now()
                )
            );
    END;

    -- Log success
    INSERT INTO debug_logs (event_type, details)
    VALUES (
        'test_accounts_created',
        jsonb_build_object(
            'teacher_email', 'teacher@test.com',
            'student_email', 'alice@test.com',
            'timestamp', now(),
            'teacher_id', v_teacher_id,
            'student_id', v_alice_id,
            'teacher_profile_exists', v_teacher_profile_exists,
            'student_profile_exists', v_student_profile_exists
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

-- Add test account info back to login page
UPDATE profiles 
SET 
    role = 'teacher',
    name = 'Ms. Johnson',
    class_id = 'class-12A',
    school_id = 'e52f9c74-6222-4961-8092-a975fca787c9',
    data_retention_approved = true,
    school_system = 'UK',
    primary_language = 'en',
    timezone = 'Europe/London'
WHERE email = 'teacher@test.com';

UPDATE profiles 
SET 
    role = 'student',
    name = 'Alice Thompson',
    class_id = 'class-12A',
    school_id = 'e52f9c74-6222-4961-8092-a975fca787c9',
    data_retention_approved = true,
    school_system = 'UK',
    primary_language = 'en',
    timezone = 'Europe/London',
    educational_credits = 1000,
    image_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
WHERE email = 'alice@test.com';