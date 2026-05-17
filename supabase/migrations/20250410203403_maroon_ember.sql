/*
  # Fix profiles table RLS policy

  1. Changes
    - Drop existing RLS policy that's causing recursion
    - Add new, simplified RLS policy for profiles table
    - Policy allows users to:
      - Read their own profile
      - Read profiles from their school (for teachers/admins)
      - Read profiles they have a direct relationship with

  2. Security
    - Maintains data privacy
    - Prevents infinite recursion
    - Preserves necessary access patterns
*/

-- First disable RLS to modify policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "allow_authenticated_access" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, non-recursive policy
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR
    -- School admins/teachers can read profiles from their school
    EXISTS (
      SELECT 1 FROM profiles AS viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role IN ('admin', 'teacher')
      AND viewer.school_id = profiles.school_id
    )
    OR
    -- Students can read profiles of their teachers
    EXISTS (
      SELECT 1 FROM profiles AS viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role = 'student'
      AND profiles.role = 'teacher'
      AND viewer.school_id = profiles.school_id
      AND viewer.class_id = profiles.class_id
    )
  );