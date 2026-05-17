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

-- Create single, simple policy for authenticated access
CREATE POLICY "allow_authenticated_access"
    ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);