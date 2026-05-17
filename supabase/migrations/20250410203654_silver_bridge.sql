/*
  # Fix profiles policy to use auth.uid()

  1. Changes
    - Replace uid() with auth.uid()
    - Maintain same access control logic
    - Fix function reference error
    
  2. Security
    - Maintain secure access controls
    - Keep existing authorization rules
*/

-- Drop the existing policy that's causing recursion
DROP POLICY IF EXISTS "profiles_select_policy" ON "public"."profiles";

-- Create new policy with optimized logic
CREATE POLICY "profiles_select_policy" ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = id
  
  -- Admins and teachers can see profiles in their school
  OR (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN profiles p ON p.id = au.id
      WHERE 
        au.id = auth.uid() 
        AND p.role IN ('admin', 'teacher')
        AND p.school_id = profiles.school_id
    )
  )
  
  -- Students can see their teachers
  OR (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN profiles p ON p.id = au.id
      WHERE 
        au.id = auth.uid()
        AND p.role = 'student'
        AND profiles.role = 'teacher'
        AND p.school_id = profiles.school_id
        AND p.class_id = profiles.class_id
    )
  )
);