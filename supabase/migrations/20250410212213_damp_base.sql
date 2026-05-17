-- First, disable RLS temporarily
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

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a single, simple policy for all authenticated access
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