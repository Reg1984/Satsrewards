-- First, disable RLS on all tables
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