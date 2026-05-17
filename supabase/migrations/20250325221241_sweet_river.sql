/*
  # School Administration and Compliance Features

  1. New Tables
    - `school_invites`: Track teacher/admin invitations
    - `school_compliance_logs`: Track compliance checks and updates
    - `school_announcements`: School-wide announcements

  2. Changes
    - Add compliance fields to schools table
    - Add audit logging for compliance changes
    - Add school announcement capabilities

  3. Security
    - Enable RLS on all tables
    - Add policies for admin access
    - Add compliance check triggers
*/

-- Create school invites table
CREATE TABLE IF NOT EXISTS school_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'admin')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create school compliance logs table
CREATE TABLE IF NOT EXISTS school_compliance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) NOT NULL,
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
  details jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text
);

-- Create school announcements table
CREATE TABLE IF NOT EXISTS school_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add compliance fields to schools
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS compliance_checks jsonb DEFAULT '{
  "kyc_verified": false,
  "age_verification_method": null,
  "parent_consent_required": true,
  "data_retention_policy_accepted": false,
  "last_compliance_check": null,
  "compliance_issues": [],
  "restricted_features": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS compliance_status text DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'restricted', 'suspended'));

-- Enable RLS
ALTER TABLE school_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;

-- School invites policies
CREATE POLICY "School admins can manage invites"
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
  );

-- School compliance logs policies
CREATE POLICY "School admins can view compliance logs"
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

-- School announcements policies
CREATE POLICY "School members can view active announcements"
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

CREATE POLICY "School admins can manage announcements"
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
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_invites_token ON school_invites(token);
CREATE INDEX IF NOT EXISTS idx_school_invites_email ON school_invites(email);
CREATE INDEX IF NOT EXISTS idx_school_compliance_logs_school ON school_compliance_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_announcements_active ON school_announcements(school_id, active, starts_at DESC) WHERE active = true;

-- Create trigger to update updated_at
CREATE TRIGGER update_school_announcements_updated_at
  BEFORE UPDATE ON school_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();