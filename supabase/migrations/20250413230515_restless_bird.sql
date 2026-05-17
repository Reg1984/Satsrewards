/*
  # Re-enable RLS on School Administration Tables
  
  1. New Policies
    - Add proper RLS policies for school_invites, school_compliance_logs, and school_announcements tables
    - Implement secure access controls
    - Fix previous security issues
    
  2. Security
    - Admins can manage invites, compliance logs, and announcements for their school
    - Teachers can view announcements for their school
    - Prevent unauthorized access
*/

-- First, ensure RLS is enabled on school_invites table
ALTER TABLE school_invites ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on school_invites table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'school_invites'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON school_invites';
    END LOOP;
END $$;

-- Create policy for admins to manage invites for their school
CREATE POLICY "admins_can_manage_school_invites"
ON school_invites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_invites.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_invites.school_id
  )
);

-- Now, ensure RLS is enabled on school_compliance_logs table
ALTER TABLE school_compliance_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on school_compliance_logs table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'school_compliance_logs'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON school_compliance_logs';
    END LOOP;
END $$;

-- Create policy for admins to view compliance logs for their school
CREATE POLICY "admins_can_view_compliance_logs"
ON school_compliance_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_compliance_logs.school_id
  )
);

-- Now, ensure RLS is enabled on school_announcements table
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on school_announcements table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'school_announcements'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON school_announcements';
    END LOOP;
END $$;

-- Create policy for all school members to view active announcements
CREATE POLICY "school_members_can_view_announcements"
ON school_announcements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = school_announcements.school_id
  )
  AND active = true
  AND (ends_at IS NULL OR ends_at > now())
);

-- Create policy for admins to manage announcements for their school
CREATE POLICY "admins_can_manage_announcements"
ON school_announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_announcements.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = school_announcements.school_id
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_school_invites_school
ON school_invites(school_id);

CREATE INDEX IF NOT EXISTS idx_school_compliance_logs_school
ON school_compliance_logs(school_id);

CREATE INDEX IF NOT EXISTS idx_school_announcements_school_active
ON school_announcements(school_id, active);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_enabled',
  jsonb_build_object(
    'table', 'school_administration',
    'timestamp', now(),
    'policies', array[
      'admins_can_manage_school_invites',
      'admins_can_view_compliance_logs',
      'school_members_can_view_announcements',
      'admins_can_manage_announcements'
    ]
  )
);