/*
  # Re-enable RLS on Profiles Table with Proper Policies
  
  1. Changes
    - Re-enable RLS on profiles table
    - Create proper RLS policies for different access patterns
    - Fix authentication flow issues
    
  2. Security
    - Users can read/update their own profile
    - Teachers can view profiles in their class
    - Admins can view profiles in their school
    - Allow users to insert their own profile during signup
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
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy for users to insert their own profile (needed for signup)
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create policy for teachers to view profiles in their class
CREATE POLICY "Teachers can view class profiles"
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
CREATE POLICY "Admins can view school profiles"
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
      'Users can read own profile',
      'Users can update own profile',
      'Users can insert own profile',
      'Teachers can view class profiles',
      'Admins can view school profiles'
    ],
    'description', 'Re-enabled RLS with proper policies'
  )
);