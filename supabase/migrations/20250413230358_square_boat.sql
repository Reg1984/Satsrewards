/*
  # Re-enable RLS on Schools Table
  
  1. New Policies
    - Add proper RLS policies for schools table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can view their own school
    - Admins can manage their own school
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'schools'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON schools';
    END LOOP;
END $$;

-- Create policy for users to view their own school
CREATE POLICY "users_can_view_own_school"
ON schools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
  )
);

-- Create policy for admins to update their own school
CREATE POLICY "admins_can_update_own_school"
ON schools
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = schools.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = schools.id
  )
);

-- Create policy for admins to insert schools
CREATE POLICY "admins_can_insert_schools"
ON schools
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_role
ON profiles(school_id, role);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'schools',
    'timestamp', now(),
    'policies', array[
      'users_can_view_own_school',
      'admins_can_update_own_school',
      'admins_can_insert_schools'
    ]
  )
);