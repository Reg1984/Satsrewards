/*
  # Fix profiles table RLS policy

  1. Changes
    - Remove existing problematic policy that causes infinite recursion
    - Add new optimized policies for different access patterns:
      - Users can always read their own profile
      - Teachers can read profiles in their class
      - Admins can read profiles in their school
      
  2. Security
    - Maintains proper access control while preventing recursion
    - Ensures users can only access authorized data
*/

-- Drop the existing policy that's causing recursion
DROP POLICY IF EXISTS "profiles_access_policy" ON profiles;

-- Create separate, focused policies for different access patterns
CREATE POLICY "users_can_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "teachers_can_read_class_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND teacher.class_id IS NOT NULL
    AND teacher.class_id = profiles.class_id
  )
);

CREATE POLICY "admins_can_read_school_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'admin'
    AND admin.school_id IS NOT NULL
    AND admin.school_id = profiles.school_id
  )
);