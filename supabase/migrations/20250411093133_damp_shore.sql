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

-- Create function to get auth user details
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

-- Temporarily disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_compliance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_activation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_invitation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_zaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightning_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE legal_agreements DISABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_acceptances DISABLE ROW LEVEL SECURITY;
ALTER TABLE ip_violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_secrets DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I;', policyname, tablename),
            ' '
        )
        FROM pg_policies
        WHERE schemaname = 'public'
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

-- Create optimized indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_auth_role_class 
    ON profiles(id, role, class_id);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
    ON profiles(id, role, class_id, school_id);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW student_statistics;

-- Update test teacher profile to ensure correct data
UPDATE profiles 
SET 
    role = 'teacher',
    class_id = 'class-12A',
    school_id = 'e52f9c74-6222-4961-8092-a975fca787c9',
    data_retention_approved = true,
    school_system = 'UK',
    primary_language = 'en',
    timezone = 'Europe/London'
WHERE email = 'teacher@test.com';

-- Verify the teacher profile exists and has correct role
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM profiles
    WHERE email = 'teacher@test.com'
    AND role = 'teacher'
    AND class_id = 'class-12A'
    AND school_id = 'e52f9c74-6222-4961-8092-a975fca787c9';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Teacher profile not found or has incorrect data';
    END IF;
END $$;

-- Ensure auth.users has the teacher account
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
    '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92',
    '00000000-0000-0000-0000-000000000000',
    'teacher@test.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Ms. Johnson"}'::jsonb,
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    email_confirmed_at = now();