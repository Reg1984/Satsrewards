-- Temporarily disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
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
    
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON schools;', policyname),
            ' '
        )
        FROM pg_policies
        WHERE tablename = 'schools'
    );
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create single, simple policy for authenticated access to profiles
CREATE POLICY "allow_authenticated_access"
    ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create single, simple policy for authenticated access to schools
CREATE POLICY "allow_authenticated_access"
    ON schools
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);