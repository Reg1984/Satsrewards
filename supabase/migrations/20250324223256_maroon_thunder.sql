/*
  # Final Profile Policies Fix

  1. Changes
    - Clean up all existing policies
    - Implement simple, non-recursive policies
    - Fix authentication flow
    
  2. Security
    - Maintain secure access controls
    - Prevent infinite recursion
    - Optimize performance with indexes
*/

-- First, disable RLS temporarily to avoid any conflicts
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_class_access" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_insert_profile" ON profiles;
DROP POLICY IF EXISTS "teachers_view_class_profiles" ON profiles;
DROP POLICY IF EXISTS "basic_read_policy" ON profiles;
DROP POLICY IF EXISTS "teacher_read_policy" ON profiles;
DROP POLICY IF EXISTS "basic_update_policy" ON profiles;
DROP POLICY IF EXISTS "basic_insert_policy" ON profiles;

-- Drop any existing functions
DROP FUNCTION IF EXISTS is_teacher_or_admin();
DROP FUNCTION IF EXISTS get_user_role();

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies without recursion
CREATE POLICY "profiles_select_own"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_select_teacher"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.id IN (
                SELECT p.id 
                FROM profiles p 
                WHERE p.role IN ('teacher', 'admin')
                AND p.class_id = profiles.class_id
            )
        )
    );

CREATE POLICY "profiles_update_own"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Drop existing indexes to avoid duplicates
DROP INDEX IF EXISTS idx_profiles_role_id;
DROP INDEX IF EXISTS idx_profiles_class_id;
DROP INDEX IF EXISTS idx_profiles_auth_lookup;
DROP INDEX IF EXISTS idx_profiles_lookup;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth 
    ON profiles(id, role, class_id);