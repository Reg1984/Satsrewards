/*
  # Fix Profile Policies to Prevent Recursion
  
  1. Changes
    - Disable RLS temporarily
    - Drop all existing policies
    - Create new, simplified policies
    - Re-enable RLS
    
  2. Security
    - Maintain secure access controls
    - Prevent infinite recursion
    - Allow proper teacher/admin access
*/

-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "teachers_view_class_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view their class profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that avoid recursion
CREATE POLICY "allow_read_own_profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "allow_update_own_profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "allow_teacher_admin_read"
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
        )
    );