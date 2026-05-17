/*
  # Re-enable RLS on Lightning Transactions Table
  
  1. New Policies
    - Add proper RLS policies for lightning_transactions table
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Users can view their own transactions
    - Users can create withdrawal requests
    - Teachers/admins can view school funding transactions
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on lightning_transactions table
ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'lightning_transactions'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON lightning_transactions';
    END LOOP;
END $$;

-- Create policy for users to view their own transactions
CREATE POLICY "users_can_view_own_transactions"
ON lightning_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for users to create withdrawal requests
CREATE POLICY "users_can_create_withdrawal_requests"
ON lightning_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  type = 'withdrawal'
);

-- Create policy for teachers/admins to view school funding transactions
CREATE POLICY "staff_can_view_school_funding"
ON lightning_transactions
FOR SELECT
TO authenticated
USING (
  type = 'school_funding' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = lightning_transactions.school_id
  )
);

-- Create policy for teachers/admins to create school funding transactions
CREATE POLICY "staff_can_create_school_funding"
ON lightning_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'school_funding' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = lightning_transactions.school_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_lightning_transactions_user_type
ON lightning_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_lightning_transactions_school_type
ON lightning_transactions(school_id, type);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'lightning_transactions',
    'timestamp', now(),
    'policies', array[
      'users_can_view_own_transactions',
      'users_can_create_withdrawal_requests',
      'staff_can_view_school_funding',
      'staff_can_create_school_funding'
    ]
  )
);