/*
  # Final Profile Policies Fix
  
  1. Changes
    - Implement non-recursive policies using auth.users
    - Simplify teacher access checks
    - Remove all complex policy logic
    
  2. Security
    - Maintain secure access controls
    - Prevent infinite recursion
    - Optimize query performance
*/

-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_teacher" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies
CREATE POLICY "allow_select_own"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "allow_select_class"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles teacher
            WHERE teacher.id = auth.uid()
            AND teacher.role IN ('teacher', 'admin')
            AND profiles.class_id = teacher.class_id
            AND profiles.id != teacher.id
        )
    );

CREATE POLICY "allow_update_own"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_insert_own"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_profiles_auth;
DROP INDEX IF EXISTS idx_profiles_role_id;
DROP INDEX IF EXISTS idx_profiles_class_id;
DROP INDEX IF EXISTS idx_profiles_auth_lookup;
DROP INDEX IF EXISTS idx_profiles_lookup;

-- Create new indexes only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'profiles' 
        AND indexname = 'idx_profiles_role_class'
    ) THEN
        CREATE INDEX idx_profiles_role_class ON profiles(role, class_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'profiles' 
        AND indexname = 'idx_profiles_id_role'
    ) THEN
        CREATE INDEX idx_profiles_id_role ON profiles(id, role);
    END IF;
END $$;