/*
  # Re-enable RLS on Two-Factor Authentication Table
  
  1. New Policies
    - Add proper RLS policies for two_factor_secrets table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can only access their own 2FA secrets
    - Prevent unauthorized access to sensitive authentication data
*/

-- First, ensure RLS is enabled on two_factor_secrets table
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on two_factor_secrets table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'two_factor_secrets'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON two_factor_secrets';
    END LOOP;
END $$;

-- Create policy for users to manage their own 2FA secrets
CREATE POLICY "users_can_manage_own_2fa"
ON two_factor_secrets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_two_factor_secrets_user
ON two_factor_secrets(user_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'two_factor_secrets',
    'timestamp', now(),
    'policies', array[
      'users_can_manage_own_2fa'
    ]
  )
);