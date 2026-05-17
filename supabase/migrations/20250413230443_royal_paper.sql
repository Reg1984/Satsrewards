/*
  # Re-enable RLS on Educational Content and Student Progress Tables
  
  1. New Policies
    - Add proper RLS policies for educational_content and student_progress tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - All users can view published educational content
    - Students can view and update their own progress
    - Teachers can manage educational content
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on educational_content table
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on educational_content table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'educational_content'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON educational_content';
    END LOOP;
END $$;

-- Create policy for all users to view published educational content
CREATE POLICY "users_can_view_published_content"
ON educational_content
FOR SELECT
TO authenticated
USING (published = true);

-- Create policy for teachers and admins to manage educational content
CREATE POLICY "staff_can_manage_content"
ON educational_content
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
);

-- Now, ensure RLS is enabled on student_progress table
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on student_progress table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'student_progress'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON student_progress';
    END LOOP;
END $$;

-- Create policy for students to view their own progress
CREATE POLICY "students_can_view_own_progress"
ON student_progress
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for students to update their own progress
CREATE POLICY "students_can_update_own_progress"
ON student_progress
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Create policy for students to update their own progress
CREATE POLICY "students_can_modify_own_progress"
ON student_progress
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Create policy for teachers to view progress for students in their class
CREATE POLICY "teachers_can_view_class_progress"
ON student_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = student_progress.student_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_educational_content_published
ON educational_content(published);

CREATE INDEX IF NOT EXISTS idx_student_progress_student
ON student_progress(student_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'educational_content_and_progress',
    'timestamp', now(),
    'policies', array[
      'users_can_view_published_content',
      'staff_can_manage_content',
      'students_can_view_own_progress',
      'students_can_update_own_progress',
      'students_can_modify_own_progress',
      'teachers_can_view_class_progress'
    ]
  )
);