/*
  # Re-enable RLS on Withdrawals Table
  
  1. New Policies
    - Add proper RLS policies for withdrawals table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Students can view and create their own withdrawals
    - Teachers can view withdrawals for students in their class
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on withdrawals table
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on withdrawals table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'withdrawals'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON withdrawals';
    END LOOP;
END $$;

-- Create policy for students to view their own withdrawals
CREATE POLICY "students_can_view_own_withdrawals"
ON withdrawals
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for students to create withdrawal requests
CREATE POLICY "students_can_create_withdrawals"
ON withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid() AND
  status = 'pending'
);

-- Create policy for teachers to view withdrawals for students in their class
CREATE POLICY "teachers_can_view_class_withdrawals"
ON withdrawals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  )
);

-- Create policy for teachers to approve/reject withdrawals
CREATE POLICY "teachers_can_approve_withdrawals"
ON withdrawals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_student
ON withdrawals(student_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'withdrawals',
    'timestamp', now(),
    'policies', array[
      'students_can_view_own_withdrawals',
      'students_can_create_withdrawals',
      'teachers_can_view_class_withdrawals',
      'teachers_can_approve_withdrawals'
    ]
  )
);