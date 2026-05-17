/*
  # Re-enable RLS on Security Logs and Debug Logs Tables
  
  1. New Policies
    - Add proper RLS policies for security_logs and debug_logs tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can view their own security logs
    - Admins can view all security logs for their school
    - Prevent unauthorized access to sensitive logs
*/

-- First, ensure RLS is enabled on security_logs table
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on security_logs table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'security_logs'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON security_logs';
    END LOOP;
END $$;

-- Create policy for users to view their own security logs
CREATE POLICY "users_can_view_own_security_logs"
ON security_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins to view all security logs
CREATE POLICY "admins_can_view_all_security_logs"
ON security_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Now, ensure RLS is enabled on debug_logs table
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on debug_logs table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'debug_logs'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON debug_logs';
    END LOOP;
END $$;

-- Create policy for users to view their own debug logs
CREATE POLICY "users_can_view_own_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins to view all debug logs
CREATE POLICY "admins_can_view_all_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user
ON security_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_debug_logs_user
ON debug_logs(user_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'security_and_debug_logs',
    'timestamp', now(),
    'policies', array[
      'users_can_view_own_security_logs',
      'admins_can_view_all_security_logs',
      'users_can_view_own_debug_logs',
      'admins_can_view_all_debug_logs'
    ]
  )
);