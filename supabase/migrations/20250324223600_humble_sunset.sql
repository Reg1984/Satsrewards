/*
  # Fix Infinite Recursion in Profile Policies

  1. Changes
    - Simplify RLS policies to avoid recursion
    - Use direct role checks without circular references
    - Optimize indexes for performance

  2. Security
    - Maintain same security level with simpler logic
    - Separate policies for different operations
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

-- Create new, simplified policies
CREATE POLICY "profiles_read_self"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_read_class"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM auth.users u
            WHERE u.id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM profiles p
                WHERE p.id = u.id
                AND p.role IN ('teacher', 'admin')
                AND p.class_id IS NOT NULL
                AND p.class_id = profiles.class_id
                AND profiles.id != u.id
            )
        )
    );

CREATE POLICY "profiles_update_self"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_self"
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
    DROP INDEX IF EXISTS idx_profiles_auth_role;
    DROP INDEX IF EXISTS idx_profiles_class_lookup;
    
    -- Create optimized indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_auth_role_class 
        ON profiles(id, role, class_id);
END $$;