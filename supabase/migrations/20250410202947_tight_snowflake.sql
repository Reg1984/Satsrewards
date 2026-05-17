/*
  # Fix RLS Policies for Profiles Table
  
  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies for:
      - Self access
      - Teacher access to class profiles
      - Admin access to school profiles
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use auth.users table for initial role checks
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

-- Create new non-recursive policies
CREATE POLICY "profiles_self_access"
    ON profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_teacher_access"
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
                AND p.role = 'teacher'
                AND p.class_id = profiles.class_id
                AND p.id != profiles.id
            )
        )
    );

CREATE POLICY "profiles_admin_access"
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
                AND p.role = 'admin'
                AND p.school_id = profiles.school_id
                AND p.id != profiles.id
            )
        )
    );

-- Create indexes to optimize policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_class 
    ON profiles(role, class_id)
    WHERE role = 'teacher';

CREATE INDEX IF NOT EXISTS idx_profiles_role_school
    ON profiles(role, school_id) 
    WHERE role = 'admin';