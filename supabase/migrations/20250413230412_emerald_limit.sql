/*
  # Re-enable RLS on Student Zaps Table
  
  1. New Policies
    - Add proper RLS policies for student_zaps table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Students can view zaps they've sent or received
    - Students can create zaps
    - Teachers can approve/reject zaps
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on student_zaps table
ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'student_zaps'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON student_zaps';
    END LOOP;
END $$;

-- Create policy for students to view zaps they've sent or received
CREATE POLICY "students_can_view_own_zaps"
ON student_zaps
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- Create policy for students to create zaps
CREATE POLICY "students_can_create_zaps"
ON student_zaps
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'student'
  )
);

-- Create policy for teachers to view zaps for students in their class
CREATE POLICY "teachers_can_view_class_zaps"
ON student_zaps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles sender ON sender.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND sender.id = student_zaps.sender_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles receiver ON receiver.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND receiver.id = student_zaps.receiver_id
  )
);

-- Create policy for teachers to approve/reject zaps
CREATE POLICY "teachers_can_approve_zaps"
ON student_zaps
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles sender ON sender.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND sender.id = student_zaps.sender_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles sender ON sender.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND sender.id = student_zaps.sender_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_student_zaps_sender_receiver
ON student_zaps(sender_id, receiver_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'student_zaps',
    'timestamp', now(),
    'policies', array[
      'students_can_view_own_zaps',
      'students_can_create_zaps',
      'teachers_can_view_class_zaps',
      'teachers_can_approve_zaps'
    ]
  )
);