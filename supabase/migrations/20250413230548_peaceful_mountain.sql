/*
  # Re-enable RLS on Legal Agreements Tables
  
  1. New Policies
    - Add proper RLS policies for legal_agreements, agreement_acceptances, and ip_violations tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - All users can view active legal agreements
    - Users can view their own agreement acceptances
    - Admins can manage legal agreements
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on legal_agreements table
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on legal_agreements table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'legal_agreements'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON legal_agreements';
    END LOOP;
END $$;

-- Create policy for all users to view legal agreements
CREATE POLICY "users_can_view_legal_agreements"
ON legal_agreements
FOR SELECT
TO authenticated
USING (true);

-- Create policy for admins to manage legal agreements
CREATE POLICY "admins_can_manage_legal_agreements"
ON legal_agreements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Now, ensure RLS is enabled on agreement_acceptances table
ALTER TABLE agreement_acceptances ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on agreement_acceptances table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'agreement_acceptances'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON agreement_acceptances';
    END LOOP;
END $$;

-- Create policy for users to view their own agreement acceptances
CREATE POLICY "users_can_view_own_acceptances"
ON agreement_acceptances
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for users to accept agreements
CREATE POLICY "users_can_accept_agreements"
ON agreement_acceptances
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Now, ensure RLS is enabled on ip_violations table
ALTER TABLE ip_violations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on ip_violations table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ip_violations'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON ip_violations';
    END LOOP;
END $$;

-- Create policy for users to report IP violations
CREATE POLICY "users_can_report_violations"
ON ip_violations
FOR INSERT
TO authenticated
WITH CHECK (reported_by = auth.uid());

-- Create policy for admins to view all IP violations
CREATE POLICY "admins_can_view_violations"
ON ip_violations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy for admins to manage IP violations
CREATE POLICY "admins_can_manage_violations"
ON ip_violations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_user
ON agreement_acceptances(user_id);

CREATE INDEX IF NOT EXISTS idx_ip_violations_reported_by
ON ip_violations(reported_by);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'legal_agreements',
    'timestamp', now(),
    'policies', array[
      'users_can_view_legal_agreements',
      'admins_can_manage_legal_agreements',
      'users_can_view_own_acceptances',
      'users_can_accept_agreements',
      'users_can_report_violations',
      'admins_can_view_violations',
      'admins_can_manage_violations'
    ]
  )
);