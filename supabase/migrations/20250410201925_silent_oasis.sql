-- Create function to handle zap approval
CREATE OR REPLACE FUNCTION handle_zap_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process newly approved zaps
  IF NEW.approved = true AND OLD.approved = false THEN
    -- Create award record for recipient
    INSERT INTO awards (
      student_id,
      sats,
      reason,
      metadata
    ) VALUES (
      NEW.receiver_id,
      NEW.amount_sats,
      'Zap from ' || (SELECT name FROM profiles WHERE id = NEW.sender_id),
      jsonb_build_object(
        'zap_id', NEW.id,
        'sender_id', NEW.sender_id,
        'approved_by', NEW.approved_by,
        'approved_at', NEW.approved_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS zap_approval_trigger ON student_zaps;
CREATE TRIGGER zap_approval_trigger
  AFTER UPDATE ON student_zaps
  FOR EACH ROW
  WHEN (NEW.approved = true AND OLD.approved = false)
  EXECUTE FUNCTION handle_zap_approval();

-- Ensure teacher role has proper permissions
DO $$ 
BEGIN
  -- Reset RLS for profiles table
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- Create policy for teacher access
  CREATE POLICY "teacher_access_policy" ON profiles
    FOR ALL
    TO authenticated
    USING (
      (auth.uid() = id) OR  -- User can access their own profile
      (EXISTS (
        SELECT 1 FROM profiles teacher
        WHERE teacher.id = auth.uid()
        AND teacher.role = 'teacher'
        AND teacher.class_id = profiles.class_id
      ))
    );
END $$;