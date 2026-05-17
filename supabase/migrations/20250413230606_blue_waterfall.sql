/*
  # Re-enable RLS on Reward Rules Table
  
  1. New Policies
    - Add proper RLS policies for reward_rules table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Teachers can view reward rules for their school
    - Teachers can create reward rules for their class
    - Admins can manage all reward rules for their school
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on reward_rules table
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on reward_rules table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'reward_rules'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON reward_rules';
    END LOOP;
END $$;

-- Create policy for teachers to view reward rules for their school
CREATE POLICY "teachers_can_view_school_rules"
ON reward_rules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = reward_rules.school_id
  )
);

-- Create policy for teachers to create reward rules for their class
CREATE POLICY "teachers_can_create_class_rules"
ON reward_rules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND profiles.school_id = reward_rules.school_id
    AND (
      reward_rules.class_id IS NULL OR
      profiles.class_id = reward_rules.class_id
    )
  )
  AND created_by = auth.uid()
);

-- Create policy for teachers to update their own reward rules
CREATE POLICY "teachers_can_update_own_rules"
ON reward_rules
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND profiles.school_id = reward_rules.school_id
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND profiles.school_id = reward_rules.school_id
  )
);

-- Create policy for teachers to delete their own reward rules
CREATE POLICY "teachers_can_delete_own_rules"
ON reward_rules
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND profiles.school_id = reward_rules.school_id
  )
);

-- Create policy for admins to manage all reward rules for their school
CREATE POLICY "admins_can_manage_all_rules"
ON reward_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = reward_rules.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = reward_rules.school_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_reward_rules_school_class
ON reward_rules(school_id, class_id);

CREATE INDEX IF NOT EXISTS idx_reward_rules_created_by
ON reward_rules(created_by);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'reward_rules',
    'timestamp', now(),
    'policies', array[
      'teachers_can_view_school_rules',
      'teachers_can_create_class_rules',
      'teachers_can_update_own_rules',
      'teachers_can_delete_own_rules',
      'admins_can_manage_all_rules'
    ]
  )
);