/*
  # Re-enable RLS on Parent Communication Tables
  
  1. New Policies
    - Add proper RLS policies for parent_messages and parent_notifications tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can view messages they've sent or received
    - Parents can view notifications for their children
    - Teachers can manage communications with parents
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on parent_messages table
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on parent_messages table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'parent_messages'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON parent_messages';
    END LOOP;
END $$;

-- Create policy for users to view messages they've sent or received
CREATE POLICY "users_can_view_own_messages"
ON parent_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Create policy for users to send messages
CREATE POLICY "users_can_send_messages"
ON parent_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Create policy for teachers to view messages related to students in their class
CREATE POLICY "teachers_can_view_class_messages"
ON parent_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = parent_messages.student_id
  )
);

-- Now, ensure RLS is enabled on parent_notifications table
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on parent_notifications table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'parent_notifications'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON parent_notifications';
    END LOOP;
END $$;

-- Create policy for parents to view notifications for their children
CREATE POLICY "parents_can_view_child_notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = parent_notifications.student_id
    AND profiles.parent_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Create policy for students to view their own notifications
CREATE POLICY "students_can_view_own_notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Create policy for teachers to view notifications for students in their class
CREATE POLICY "teachers_can_view_class_notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = parent_notifications.student_id
  )
);

-- Create policy for teachers to create notifications for students in their class
CREATE POLICY "teachers_can_create_notifications"
ON parent_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = parent_notifications.student_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_parent_messages_sender_recipient
ON parent_messages(sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_student
ON parent_notifications(student_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'parent_communications',
    'timestamp', now(),
    'policies', array[
      'users_can_view_own_messages',
      'users_can_send_messages',
      'teachers_can_view_class_messages',
      'parents_can_view_child_notifications',
      'students_can_view_own_notifications',
      'teachers_can_view_class_notifications',
      'teachers_can_create_notifications'
    ]
  )
);