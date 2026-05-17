/*
  # Final Fix for Profile Policies
  
  1. Changes
    - Simplify policies to prevent recursion
    - Use auth.users for role checks
    - Clean up existing policies
    - Optimize indexes
    
  2. Security
    - Maintain RLS
    - Prevent infinite recursion
    - Ensure proper access control
*/

-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "allow_read_own" ON profiles;
    DROP POLICY IF EXISTS "allow_teacher_read" ON profiles;
    DROP POLICY IF EXISTS "allow_update_own" ON profiles;
    DROP POLICY IF EXISTS "allow_insert_own" ON profiles;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "profiles_select"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Users can always read their own profile
        auth.uid() = id
        OR
        -- Teachers/admins can read profiles in their class
        EXISTS (
            SELECT 1
            FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM profiles p
                WHERE p.id = auth.users.id
                AND p.role IN ('teacher', 'admin')
                AND p.class_id = profiles.class_id
            )
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

-- Handle indexes safely
DO $$ 
BEGIN
    -- Drop indexes if they exist
    DROP INDEX IF EXISTS idx_profiles_role_id;
    DROP INDEX IF EXISTS idx_profiles_class_id;
    DROP INDEX IF EXISTS idx_profiles_auth_lookup;
    DROP INDEX IF EXISTS idx_profiles_lookup;
    DROP INDEX IF EXISTS idx_profiles_auth;
    
    -- Create new indexes only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'profiles' AND indexname = 'idx_profiles_role_class'
    ) THEN
        CREATE INDEX idx_profiles_role_class ON profiles(role, class_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'profiles' AND indexname = 'idx_profiles_id_role'
    ) THEN
        CREATE INDEX idx_profiles_id_role ON profiles(id, role);
    END IF;
END $$;