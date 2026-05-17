/*
  # Re-enable RLS on Activation Codes Tables
  
  1. New Policies
    - Add proper RLS policies for school_activation_codes and student_invitation_codes tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Admins can manage activation codes for their school
    - Teachers can manage student invitation codes for their class
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on school_activation_codes table
ALTER TABLE school_activation_codes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on school_activation_codes table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'school_activation_codes'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON school_activation_codes';
    END LOOP;
END $$;

-- Create policy for admins to view activation codes for their school
CREATE POLICY "admins_can_view_activation_codes"
ON school_activation_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_activation_codes.school_id
  )
);

-- Now, ensure RLS is enabled on student_invitation_codes table
ALTER TABLE student_invitation_codes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on student_invitation_codes table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'student_invitation_codes'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON student_invitation_codes';
    END LOOP;
END $$;

-- Create policy for teachers to view invitation codes for their school
CREATE POLICY "teachers_can_view_invitation_codes"
ON student_invitation_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = student_invitation_codes.school_id
  )
);

-- Create policy for teachers to create invitation codes for their class
CREATE POLICY "teachers_can_create_invitation_codes"
ON student_invitation_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = student_invitation_codes.school_id
  )
  AND created_by = auth.uid()
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_school_activation_codes_school
ON school_activation_codes(school_id);

CREATE INDEX IF NOT EXISTS idx_student_invitation_codes_school_class
ON student_invitation_codes(school_id, class_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'activation_codes',
    'timestamp', now(),
    'policies', array[
      'admins_can_view_activation_codes',
      'teachers_can_view_invitation_codes',
      'teachers_can_create_invitation_codes'
    ]
  )
);