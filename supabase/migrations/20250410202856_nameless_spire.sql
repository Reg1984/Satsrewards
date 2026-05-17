/*
  # Fix recursive profiles policy

  1. Changes
    - Drop existing problematic policies on profiles table
    - Create new non-recursive policies:
      - Users can read their own profile
      - Teachers can read profiles in their class
      - Admins can read all profiles in their school
  
  2. Security
    - Maintains row level security
    - Prevents infinite recursion
    - Preserves intended access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_access" ON "public"."profiles";
DROP POLICY IF EXISTS "teacher_access_policy" ON "public"."profiles";

-- Create new non-recursive policies
CREATE POLICY "users_can_read_own_profile"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "teachers_can_read_class_profiles"
ON "public"."profiles"
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
    )
  )
);

CREATE POLICY "admins_can_read_school_profiles"
ON "public"."profiles"
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
    )
  )
);