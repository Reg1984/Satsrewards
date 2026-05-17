/*
  # Add Teacher Zap Feature
  
  1. Changes
    - Add is_teacher_initiated column to student_zaps table
    - Add trigger to handle teacher-initiated zaps
    - Update RLS policies for student_zaps table
    
  2. Security
    - Maintain RLS protection
    - Allow teachers to create zaps for students in their class
    - Auto-approve teacher-initiated zaps
*/

-- Add is_teacher_initiated column to student_zaps table
ALTER TABLE student_zaps
ADD COLUMN IF NOT EXISTS is_teacher_initiated boolean DEFAULT false;

-- Create function to handle teacher-initiated zaps
CREATE OR REPLACE FUNCTION handle_teacher_zap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process newly created teacher-initiated zaps
  IF NEW.is_teacher_initiated = true THEN
    -- Create award record for recipient
    INSERT INTO awards (
      student_id,
      sats,
      reason,
      metadata
    ) VALUES (
      NEW.receiver_id,
      NEW.amount_sats,
      NEW.reason,
      jsonb_build_object(
        'zap_id', NEW.id,
        'sender_id', NEW.sender_id,
        'approved_by', NEW.approved_by,
        'approved_at', NEW.approved_at,
        'is_teacher_initiated', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for teacher-initiated zaps
DROP TRIGGER IF EXISTS teacher_zap_trigger ON student_zaps;
CREATE TRIGGER teacher_zap_trigger
  AFTER INSERT ON student_zaps
  FOR EACH ROW
  WHEN (NEW.is_teacher_initiated = true)
  EXECUTE FUNCTION handle_teacher_zap();

-- Update RLS policies for student_zaps table
-- Allow teachers to create zaps for students in their class
DROP POLICY IF EXISTS "teachers_can_create_zaps" ON student_zaps;
CREATE POLICY "teachers_can_create_zaps"
  ON student_zaps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles teacher
      JOIN profiles student ON student.class_id = teacher.class_id
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND student.id = student_zaps.receiver_id
      AND student_zaps.is_teacher_initiated = true
      AND student_zaps.sender_id = auth.uid()
    )
  );