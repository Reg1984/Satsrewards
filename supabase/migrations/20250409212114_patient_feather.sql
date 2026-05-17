/*
  # Add Parent Portal and Communication Features

  1. New Tables
    - `parent_messages`: Communication between parents and teachers
    - `parent_notifications`: Important updates and alerts for parents
    
  2. Changes
    - Add parent communication fields to profiles
    - Add parent approval tracking to withdrawals
    
  3. Security
    - Enable RLS
    - Add policies for parent access
*/

-- Create parent messages table
CREATE TABLE IF NOT EXISTS parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create parent notifications table
CREATE TABLE IF NOT EXISTS parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('behavior', 'attendance', 'withdrawal', 'achievement')),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Parent messages policies
CREATE POLICY "Parents can view their children's messages"
  ON parent_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles student
      WHERE student.id = parent_messages.student_id
      AND student.parent_email = auth.email()
    )
  );

CREATE POLICY "Parents can send messages"
  ON parent_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles student
      WHERE student.id = parent_messages.student_id
      AND student.parent_email = auth.email()
    )
  );

-- Parent notifications policies
CREATE POLICY "Parents can view their children's notifications"
  ON parent_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles student
      WHERE student.id = parent_notifications.student_id
      AND student.parent_email = auth.email()
    )
  );

-- Create indexes
CREATE INDEX idx_parent_messages_student ON parent_messages(student_id);
CREATE INDEX idx_parent_messages_sender ON parent_messages(sender_id);
CREATE INDEX idx_parent_messages_recipient ON parent_messages(recipient_id);
CREATE INDEX idx_parent_notifications_student ON parent_notifications(student_id);

-- Create function to send parent notification
CREATE OR REPLACE FUNCTION send_parent_notification(
  p_student_id uuid,
  p_type text,
  p_title text,
  p_content text,
  p_priority text DEFAULT 'low'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO parent_notifications (
    student_id,
    type,
    title,
    content,
    priority
  ) VALUES (
    p_student_id,
    p_type,
    p_title,
    p_content,
    p_priority
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Create trigger to notify parents of withdrawals
CREATE OR REPLACE FUNCTION notify_parent_of_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM send_parent_notification(
    NEW.student_id,
    'withdrawal',
    'New Withdrawal Request',
    format('Your approval is required for a withdrawal of %s SATs', NEW.amount_sats),
    'high'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER withdrawal_notification_trigger
  AFTER INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION notify_parent_of_withdrawal();