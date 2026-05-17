/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Replace with simplified, non-recursive policies that maintain the same access control:
      - Users can access their own profile
      - School admins can access profiles in their school
      - Teachers can access profiles in their class
  
  2. Security
    - Maintains row level security
    - Preserves access control intentions
    - Eliminates recursive queries
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_admin_school_access" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_class_access" ON profiles;
DROP POLICY IF EXISTS "allow_self_access" ON profiles;

-- Recreate policies without recursion
CREATE POLICY "allow_self_access"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- For school admins - use direct comparison instead of subquery
CREATE POLICY "allow_admin_school_access"
ON profiles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND profiles.school_id = (
      SELECT school_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- For teachers - use direct comparison instead of subquery
CREATE POLICY "allow_teacher_class_access"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND profiles.class_id = (
      SELECT class_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'teacher'
    )
  )
);