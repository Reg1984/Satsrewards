-- First, disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I;', policyname, tablename),
            ' '
        )
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'schools', 'awards')
    );
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for profiles
CREATE POLICY "allow_authenticated_access"
    ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policies for schools
CREATE POLICY "allow_authenticated_access"
    ON schools
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policies for awards
CREATE POLICY "allow_authenticated_access"
    ON awards
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);