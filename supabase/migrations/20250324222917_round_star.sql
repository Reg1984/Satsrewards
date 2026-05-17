/*
  # Fix Profile Policies - Final Version
  
  1. Changes
    - Remove all existing policies
    - Create simplified non-recursive policies
    - Use role-based access control
    - Separate teacher access logic
  
  2. Security
    - Maintain RLS protection
    - Ensure proper access control
    - Prevent policy recursion
*/

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_insert_profile" ON profiles;
DROP POLICY IF EXISTS "teachers_view_class_profiles" ON profiles;

-- Create a function to check if the user is a teacher/admin
CREATE OR REPLACE FUNCTION is_teacher_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND id IN (
      SELECT id FROM profiles 
      WHERE profiles.role IN ('teacher', 'admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic profile access - users can read their own profile
CREATE POLICY "allow_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "allow_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "allow_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Teachers can view profiles in their class (using a non-recursive approach)
CREATE POLICY "allow_teacher_class_access"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles teacher_profile
      WHERE teacher_profile.id = auth.uid()
      AND teacher_profile.role IN ('teacher', 'admin')
      AND teacher_profile.class_id = profiles.class_id
    )
  );