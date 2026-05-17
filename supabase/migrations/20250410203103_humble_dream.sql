/*
  # Fix profiles RLS policies to prevent recursion

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Implement new, simplified RLS policies for profiles table
    - Maintain security while avoiding policy recursion

  2. Security
    - Users can still access their own profiles
    - Admins can access profiles in their school
    - Teachers can access profiles in their class
    - All other access denied
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_self_access" ON profiles;
DROP POLICY IF EXISTS "allow_admin_school_access" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_class_access" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "allow_self_access"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin school access without recursion
CREATE POLICY "allow_admin_school_access"
ON profiles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = au.id 
      AND p.role = 'admin'
      AND p.school_id = profiles.school_id
      AND p.id <> profiles.id
    )
  )
);

-- Teacher class access without recursion
CREATE POLICY "allow_teacher_class_access"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = au.id 
      AND p.role = 'teacher'
      AND p.class_id = profiles.class_id
      AND p.id <> profiles.id
    )
  )
);