/*
  # Re-enable RLS on Attendance and Behavior Records Tables
  
  1. New Policies
    - Add proper RLS policies for attendance and behavior_records tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Students can view their own records
    - Teachers can manage records for students in their class
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on attendance table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'attendance'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON attendance';
    END LOOP;
END $$;

-- Create policy for students to view their own attendance
CREATE POLICY "students_can_view_own_attendance"
ON attendance
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for teachers to view attendance for students in their class
CREATE POLICY "teachers_can_view_class_attendance"
ON attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = attendance.student_id
  )
);

-- Create policy for teachers to manage attendance for students in their class
CREATE POLICY "teachers_can_manage_attendance"
ON attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = attendance.student_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = attendance.student_id
  )
);

-- Now, ensure RLS is enabled on behavior_records table
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on behavior_records table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'behavior_records'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON behavior_records';
    END LOOP;
END $$;

-- Create policy for students to view their own behavior records
CREATE POLICY "students_can_view_own_behavior"
ON behavior_records
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for teachers to view behavior records for students in their class
CREATE POLICY "teachers_can_view_class_behavior"
ON behavior_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = behavior_records.student_id
  )
);

-- Create policy for teachers to manage behavior records for students in their class
CREATE POLICY "teachers_can_manage_behavior"
ON behavior_records
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = behavior_records.student_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = behavior_records.student_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_teacher
ON attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_behavior_records_student_teacher
ON behavior_records(student_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'attendance_and_behavior',
    'timestamp', now(),
    'policies', array[
      'students_can_view_own_attendance',
      'teachers_can_view_class_attendance',
      'teachers_can_manage_attendance',
      'students_can_view_own_behavior',
      'teachers_can_view_class_behavior',
      'teachers_can_manage_behavior'
    ]
  )
);