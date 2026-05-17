-- Create debug function to get auth user data
CREATE OR REPLACE FUNCTION debug_get_auth_user(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT json_build_object(
        'id', au.id,
        'email', au.email,
        'role', au.role,
        'app_metadata', au.raw_app_meta_data,
        'user_metadata', au.raw_user_meta_data,
        'created_at', au.created_at,
        'confirmed_at', au.email_confirmed_at
    )::jsonb INTO result
    FROM auth.users au
    WHERE au.id = user_id;
    
    RETURN result;
END;
$$;

-- Ensure teacher account exists and has correct data
DO $$
DECLARE
    v_teacher_id uuid := '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92';
    v_teacher_email text := 'teacher@test.com';
    v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
    v_class_id text := 'class-12A';
    v_password text := 'test123456';
    v_profile_exists boolean;
    v_profile_id uuid;
    v_has_foreign_keys boolean;
BEGIN
    -- Check if profile already exists with this email
    SELECT id INTO v_profile_id FROM profiles WHERE email = v_teacher_email;
    v_profile_exists := v_profile_id IS NOT NULL;
    
    -- Check if profile has foreign key references
    IF v_profile_exists AND v_profile_id != v_teacher_id THEN
        SELECT EXISTS (
            SELECT 1 FROM attendance WHERE created_by = v_profile_id
            UNION
            SELECT 1 FROM behavior_records WHERE created_by = v_profile_id
            UNION
            SELECT 1 FROM school_invites WHERE created_by = v_profile_id
            UNION
            SELECT 1 FROM student_invitation_codes WHERE created_by = v_profile_id
        ) INTO v_has_foreign_keys;
    ELSE
        v_has_foreign_keys := false;
    END IF;

    -- Ensure auth.user exists with correct data
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_teacher_id) THEN
        UPDATE auth.users SET
            email = v_teacher_email,
            email_confirmed_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"name":"Ms. Johnson","role":"teacher"}'::jsonb,
            encrypted_password = crypt(v_password, gen_salt('bf')),
            aud = 'authenticated',
            role = 'authenticated'
        WHERE id = v_teacher_id;
    ELSE
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
            crypt(v_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Ms. Johnson","role":"teacher"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Handle profile based on existence and foreign key constraints
    IF v_profile_exists THEN
        IF v_profile_id = v_teacher_id THEN
            -- Profile exists with correct ID, just update it
            UPDATE profiles SET
                role = 'teacher',
                name = 'Ms. Johnson',
                class_id = v_class_id,
                school_id = v_school_id,
                data_retention_approved = true,
                school_system = 'UK',
                primary_language = 'en',
                timezone = 'Europe/London'
            WHERE id = v_teacher_id;
        ELSIF v_has_foreign_keys THEN
            -- Profile exists with different ID and has foreign keys, update both
            UPDATE profiles SET
                role = 'teacher',
                name = 'Ms. Johnson',
                class_id = v_class_id,
                school_id = v_school_id,
                data_retention_approved = true,
                school_system = 'UK',
                primary_language = 'en',
                timezone = 'Europe/London'
            WHERE id = v_profile_id;
            
            -- Update auth user to match existing profile ID
            UPDATE auth.users SET
                id = v_profile_id
            WHERE id = v_teacher_id;
            
            -- Update teacher ID to match profile
            v_teacher_id := v_profile_id;
        ELSE
            -- Profile exists with different ID but no foreign keys, delete and recreate
            DELETE FROM profiles WHERE id = v_profile_id;
            
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
                v_teacher_email,
                'teacher',
                'Ms. Johnson',
                v_class_id,
                v_school_id,
                true,
                'UK',
                'en',
                'Europe/London'
            );
        END IF;
    ELSE
        -- Profile doesn't exist, create it
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
            v_teacher_email,
            'teacher',
            'Ms. Johnson',
            v_class_id,
            v_school_id,
            true,
            'UK',
            'en',
            'Europe/London'
        );
    END IF;

    -- Log verification
    INSERT INTO debug_logs (event_type, user_id, details)
    VALUES (
        'teacher_verification',
        v_teacher_id,
        jsonb_build_object(
            'email', v_teacher_email,
            'exists_in_auth', EXISTS (SELECT 1 FROM auth.users WHERE id = v_teacher_id),
            'exists_in_profiles', EXISTS (SELECT 1 FROM profiles WHERE id = v_teacher_id),
            'auth_data', (SELECT debug_get_auth_user(v_teacher_id)),
            'profile_data', (SELECT row_to_json(p) FROM profiles p WHERE id = v_teacher_id)
        )
    );
END $$;

-- Create student test accounts
DO $$
DECLARE
    v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
    v_class_id text := 'class-12A';
    v_password text := 'test123456';
    v_student_ids uuid[] := ARRAY[
        'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
        'b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e',
        'c3d4e5f6-a7b8-6c9d-0e1f-2a3b4c5d6e7f',
        'd4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f89'
    ];
    v_student_emails text[] := ARRAY[
        'alice@test.com',
        'bob@test.com',
        'charlie@test.com',
        'diana@test.com'
    ];
    v_student_names text[] := ARRAY[
        'Alice Thompson',
        'Bob Wilson',
        'Charlie Brown',
        'Diana Martinez'
    ];
    v_student_images text[] := ARRAY[
        'https://images.unsplash.com/photo-1517841905240-472988babdf9',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
    ];
    i integer;
    v_profile_exists boolean;
    v_profile_id uuid;
    v_has_foreign_keys boolean;
BEGIN
    FOR i IN 1..4 LOOP
        -- Check if profile already exists with this email
        SELECT id INTO v_profile_id FROM profiles WHERE email = v_student_emails[i];
        v_profile_exists := v_profile_id IS NOT NULL;
        
        -- Check if profile has foreign key references
        IF v_profile_exists AND v_profile_id != v_student_ids[i] THEN
            SELECT EXISTS (
                SELECT 1 FROM attendance WHERE student_id = v_profile_id
                UNION
                SELECT 1 FROM behavior_records WHERE student_id = v_profile_id
                UNION
                SELECT 1 FROM awards WHERE student_id = v_profile_id
                UNION
                SELECT 1 FROM student_progress WHERE student_id = v_profile_id
                UNION
                SELECT 1 FROM withdrawals WHERE student_id = v_profile_id
            ) INTO v_has_foreign_keys;
        ELSE
            v_has_foreign_keys := false;
        END IF;
        
        -- Ensure auth.user exists
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_student_ids[i]) THEN
            UPDATE auth.users SET
                email = v_student_emails[i],
                email_confirmed_at = now(),
                raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
                raw_user_meta_data = jsonb_build_object('name', v_student_names[i], 'role', 'student'),
                encrypted_password = crypt(v_password, gen_salt('bf')),
                aud = 'authenticated',
                role = 'authenticated'
            WHERE id = v_student_ids[i];
        ELSE
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
                v_student_ids[i],
                '00000000-0000-0000-0000-000000000000',
                v_student_emails[i],
                crypt(v_password, gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('name', v_student_names[i], 'role', 'student'),
                'authenticated',
                'authenticated'
            );
        END IF;

        -- Handle profile based on existence and foreign key constraints
        IF v_profile_exists THEN
            IF v_profile_id = v_student_ids[i] THEN
                -- Profile exists with correct ID, just update it
                UPDATE profiles SET
                    role = 'student',
                    name = v_student_names[i],
                    class_id = v_class_id,
                    school_id = v_school_id,
                    data_retention_approved = true,
                    school_system = 'UK',
                    primary_language = 'en',
                    timezone = 'Europe/London',
                    image_url = v_student_images[i],
                    educational_credits = 1000
                WHERE id = v_student_ids[i];
            ELSIF v_has_foreign_keys THEN
                -- Profile exists with different ID and has foreign keys, update both
                UPDATE profiles SET
                    role = 'student',
                    name = v_student_names[i],
                    class_id = v_class_id,
                    school_id = v_school_id,
                    data_retention_approved = true,
                    school_system = 'UK',
                    primary_language = 'en',
                    timezone = 'Europe/London',
                    image_url = v_student_images[i],
                    educational_credits = 1000
                WHERE id = v_profile_id;
                
                -- Update auth user to match existing profile ID
                UPDATE auth.users SET
                    id = v_profile_id
                WHERE id = v_student_ids[i];
                
                -- Update student ID to match profile
                v_student_ids[i] := v_profile_id;
            ELSE
                -- Profile exists with different ID but no foreign keys, delete and recreate
                DELETE FROM profiles WHERE id = v_profile_id;
                
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
                    image_url,
                    educational_credits
                ) VALUES (
                    v_student_ids[i],
                    v_student_emails[i],
                    'student',
                    v_student_names[i],
                    v_class_id,
                    v_school_id,
                    true,
                    'UK',
                    'en',
                    'Europe/London',
                    v_student_images[i],
                    1000
                );
            END IF;
        ELSE
            -- Profile doesn't exist, create it
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
                image_url,
                educational_credits
            ) VALUES (
                v_student_ids[i],
                v_student_emails[i],
                'student',
                v_student_names[i],
                v_class_id,
                v_school_id,
                true,
                'UK',
                'en',
                'Europe/London',
                v_student_images[i],
                1000
            );
        END IF;

        -- Ensure student has initial balance
        IF NOT EXISTS (
            SELECT 1 FROM awards 
            WHERE student_id = v_student_ids[i] 
            AND reason = 'Initial test balance'
        ) THEN
            INSERT INTO awards (
                student_id,
                sats,
                reason,
                created_at
            ) VALUES (
                v_student_ids[i],
                1000,
                'Initial test balance',
                now()
            );
        END IF;
    END LOOP;
END $$;