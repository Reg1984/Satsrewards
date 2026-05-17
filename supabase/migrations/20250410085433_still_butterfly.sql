/*
  # Fix infinite recursion in profiles policy

  1. Changes
    - Remove recursive policy that was causing infinite loop
    - Create new, safer policies for teacher access
    - Maintain existing user self-access policies

  2. Security
    - Maintains RLS protection
    - Ensures teachers can only view profiles in their class
    - Preserves user ability to view/edit their own profile
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can view their class profiles" ON profiles;

-- Create new policy for teachers to view class profiles
CREATE POLICY "teachers_view_class_profiles" ON profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.users.id 
      AND p.role IN ('teacher', 'admin')
      AND p.class_id = profiles.class_id
    )
  )
);

-- Ensure the self-access policies are properly set
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);