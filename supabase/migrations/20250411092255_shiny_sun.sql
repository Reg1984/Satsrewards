/*
  # Add Debug Logging and Fix Teacher Profile
  
  1. Changes
    - Add debug logging tables and triggers
    - Fix teacher profile creation to handle existing records
    - Add verification checks
    
  2. Security
    - Maintain existing security measures
    - Add detailed logging for debugging
*/

-- Create debug log table
CREATE TABLE IF NOT EXISTS debug_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create function to log auth attempts
CREATE OR REPLACE FUNCTION log_auth_attempt()
RETURNS trigger AS $$
BEGIN
    INSERT INTO debug_logs (event_type, user_id, details)
    VALUES (
        'auth_attempt',
        NEW.id,
        jsonb_build_object(
            'email', NEW.email,
            'raw_app_meta_data', NEW.raw_app_meta_data,
            'raw_user_meta_data', NEW.raw_user_meta_data
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth attempts
DROP TRIGGER IF EXISTS auth_attempt_trigger ON auth.users;
CREATE TRIGGER auth_attempt_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION log_auth_attempt();

-- Create function to log profile access
CREATE OR REPLACE FUNCTION log_profile_access()
RETURNS trigger AS $$
BEGIN
    INSERT INTO debug_logs (event_type, user_id, details)
    VALUES (
        'profile_access',
        NEW.id,
        jsonb_build_object(
            'role', NEW.role,
            'class_id', NEW.class_id,
            'school_id', NEW.school_id,
            'operation', TG_OP
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile access
DROP TRIGGER IF EXISTS profile_access_trigger ON profiles;
CREATE TRIGGER profile_access_trigger
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_profile_access();

-- Create view for debugging auth sessions
CREATE OR REPLACE VIEW debug_auth_sessions AS
SELECT 
    au.id,
    au.email,
    au.role,
    au.raw_app_meta_data,
    au.raw_user_meta_data,
    p.role as profile_role,
    p.class_id,
    p.school_id
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;

-- Verify and update teacher account
DO $$
DECLARE
    v_user_id uuid := '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92';
    v_email text := 'teacher@test.com';
    v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
BEGIN
    -- Ensure auth.user exists
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = v_user_id AND email = v_email
    ) THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            v_user_id,
            v_email,
            crypt('test123456', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Ms. Johnson"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Update existing profile or create if doesn't exist
    UPDATE profiles SET
        role = 'teacher',
        name = 'Ms. Johnson',
        class_id = 'class-12A',
        school_id = v_school_id,
        data_retention_approved = true,
        school_system = 'UK',
        primary_language = 'en',
        timezone = 'Europe/London'
    WHERE email = v_email;

    -- Insert only if no profile exists
    IF NOT FOUND THEN
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
            v_user_id,
            v_email,
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

    -- Log verification
    INSERT INTO debug_logs (event_type, user_id, details)
    VALUES (
        'teacher_verification',
        v_user_id,
        jsonb_build_object(
            'email', v_email,
            'exists_in_auth', EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id),
            'exists_in_profiles', EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id)
        )
    );
END $$;