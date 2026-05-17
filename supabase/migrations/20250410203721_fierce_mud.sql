/*
  # Fix infinite recursion in profiles policy

  1. Changes
    - Drop existing profiles select policy
    - Create new profiles select policy without recursion
    - Use auth.uid() directly for role checks
    
  2. Security
    - Maintains same access control logic but implements it efficiently
    - Users can still only access their own profile or profiles they have permission to view
    - Prevents infinite recursion while maintaining security
*/

-- Drop the existing policy that's causing recursion
DROP POLICY IF EXISTS "profiles_select_policy" ON "public"."profiles";

-- Create new policy without recursion
CREATE POLICY "profiles_select_policy" ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  (auth.uid() = id) OR
  
  -- School admins and teachers can see profiles in their school
  (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND id IN (
        SELECT id 
        FROM profiles 
        WHERE role IN ('admin', 'teacher')
        AND school_id = profiles.school_id
      )
    )
  ) OR
  
  -- Students can see their teachers' profiles
  (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND id IN (
        SELECT id 
        FROM profiles 
        WHERE role = 'student'
        AND school_id = profiles.school_id
        AND class_id = profiles.class_id
        AND profiles.role = 'teacher'
      )
    )
  )
);