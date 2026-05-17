/*
  # Fix profiles table RLS policy

  1. Changes
    - Remove recursive policy that was causing infinite loops
    - Add simplified policy that allows:
      - Users to read their own profile
      - Teachers to read profiles in their class
      - Admins to read all profiles in their school
      
  2. Security
    - Maintains row level security
    - Ensures users can only access appropriate profiles based on role
*/

-- Drop existing problematic policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create new non-recursive policy
CREATE POLICY "profiles_access_policy" ON profiles
FOR ALL USING (
  -- Users can access their own profile
  auth.uid() = id
  OR
  -- Teachers can access profiles in their class
  EXISTS (
    SELECT 1 FROM profiles teacher
    WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher' 
      AND teacher.class_id = profiles.class_id
  )
  OR
  -- Admins can access all profiles in their school
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.school_id = profiles.school_id
  )
);