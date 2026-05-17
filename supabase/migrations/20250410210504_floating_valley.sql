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
CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
    ON profiles(id, role, class_id, school_id);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW student_statistics;