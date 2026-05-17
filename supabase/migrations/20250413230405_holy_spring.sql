/*
  # Re-enable RLS on Awards Table
  
  1. New Policies
    - Add proper RLS policies for awards table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Students can view their own awards
    - Teachers can create awards for students in their class
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on awards table
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'awards'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON awards';
    END LOOP;
END $$;

-- Create policy for students to view their own awards
CREATE POLICY "students_can_view_own_awards"
ON awards
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for teachers to view awards for students in their class
CREATE POLICY "teachers_can_view_class_awards"
ON awards
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = awards.student_id
  )
);

-- Create policy for teachers to create awards for students in their class
CREATE POLICY "teachers_can_create_awards"
ON awards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = awards.student_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_awards_student_teacher
ON awards(student_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'awards',
    'timestamp', now(),
    'policies', array[
      'students_can_view_own_awards',
      'teachers_can_view_class_awards',
      'teachers_can_create_awards'
    ]
  )
);