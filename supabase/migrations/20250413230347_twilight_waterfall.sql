/*
  # Re-enable RLS with Proper Policies
  
  1. New Policies
    - Add proper RLS policies for profiles table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can read/update their own profile
    - Teachers can view profiles in their class
    - Admins can view profiles in their school
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- Create policy for users to read their own profile
CREATE POLICY "users_can_read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy for teachers to view profiles in their class
CREATE POLICY "teachers_can_view_class_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND teacher.class_id = profiles.class_id
    AND teacher.id <> profiles.id
  )
);

-- Create policy for admins to view profiles in their school
CREATE POLICY "admins_can_view_school_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'admin'
    AND admin.school_id = profiles.school_id
    AND admin.id <> profiles.id
  )
);

-- Create policy for users to insert their own profile (needed for signup)
CREATE POLICY "users_can_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_class 
ON profiles(role, class_id) 
WHERE role = 'teacher';

CREATE INDEX IF NOT EXISTS idx_profiles_role_school
ON profiles(role, school_id) 
WHERE role = 'admin';

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'profiles',
    'timestamp', now(),
    'policies', array[
      'users_can_read_own_profile',
      'users_can_update_own_profile',
      'teachers_can_view_class_profiles',
      'admins_can_view_school_profiles',
      'users_can_insert_own_profile'
    ]
  )
);