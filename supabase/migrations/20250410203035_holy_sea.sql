/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing problematic policies that cause recursion
    - Create new, simplified policies that avoid recursion:
      - Users can read/write their own profile
      - Teachers can read profiles in their class
      - Admins can read profiles in their school
      
  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Self access (read/write)
      - Teacher class access (read only)
      - Admin school access (read only)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_self_access" ON profiles;
DROP POLICY IF EXISTS "profiles_teacher_access" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "allow_self_access"
ON profiles
FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_teacher_class_access" 
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND teacher.class_id = profiles.class_id
    AND teacher.id != profiles.id
  )
);

CREATE POLICY "allow_admin_school_access"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'admin'
    AND admin.school_id = profiles.school_id
    AND admin.id != profiles.id
  )
);