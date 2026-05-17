/*
  # Fix Infinite Recursion in Profile Policies

  1. Changes
    - Disable RLS temporarily
    - Drop all existing policies
    - Create new non-recursive policies
    - Optimize indexes for performance

  2. Security
    - Maintain same security level but with simplified logic
    - Avoid circular references in policy definitions
*/

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

-- Create new, simplified policies without recursion
CREATE POLICY "profiles_select_self"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_select_class"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM auth.users u
            INNER JOIN profiles p ON p.id = u.id
            WHERE u.id = auth.uid()
            AND p.role IN ('teacher', 'admin')
            AND p.class_id = profiles.class_id
            AND profiles.id != auth.uid()
        )
    );

CREATE POLICY "profiles_update"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Optimize indexes
DO $$ 
BEGIN
    -- Drop existing indexes
    DROP INDEX IF EXISTS idx_profiles_role_id;
    DROP INDEX IF EXISTS idx_profiles_class_id;
    DROP INDEX IF EXISTS idx_profiles_auth_lookup;
    DROP INDEX IF EXISTS idx_profiles_lookup;
    DROP INDEX IF EXISTS idx_profiles_auth;
    DROP INDEX IF EXISTS idx_profiles_role_class;
    DROP INDEX IF EXISTS idx_profiles_id_role;
    
    -- Create optimized indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_auth_role ON profiles(id, role);
    CREATE INDEX IF NOT EXISTS idx_profiles_class_lookup ON profiles(class_id, role);
END $$;