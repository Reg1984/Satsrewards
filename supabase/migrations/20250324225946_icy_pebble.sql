/*
  # Add Intellectual Property Protection

  1. New Tables
    - `legal_agreements`
      - Stores terms of service and copyright notices
      - Tracks version history and acceptance
    - `ip_violations`
      - Records potential intellectual property violations
      - Tracks investigation status and actions taken

  2. Changes
    - Add copyright acceptance to profiles table
    - Add terms version tracking
    - Add IP violation reporting capabilities

  3. Security
    - Enable RLS on new tables
    - Add policies for authorized access
*/

-- Create legal agreements table
CREATE TABLE IF NOT EXISTS legal_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('terms_of_service', 'copyright_notice', 'privacy_policy')),
  version text NOT NULL,
  content text NOT NULL,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create agreement acceptance tracking
CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  agreement_id uuid REFERENCES legal_agreements(id) NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, agreement_id)
);

-- Create IP violations tracking
CREATE TABLE IF NOT EXISTS ip_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid REFERENCES profiles(id) NOT NULL,
  violation_type text NOT NULL CHECK (
    violation_type IN (
      'unauthorized_use',
      'copyright_infringement',
      'trademark_violation',
      'patent_infringement',
      'trade_secret_misuse'
    )
  ),
  description text NOT NULL,
  evidence jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'investigating', 'resolved', 'dismissed')
  ),
  resolution_notes text,
  reported_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add IP-related fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS current_tos_version text,
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ip_agreement_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_agreement_date timestamptz;

-- Enable RLS
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_violations ENABLE ROW LEVEL SECURITY;

-- Policies for legal_agreements
CREATE POLICY "Everyone can view active legal agreements"
  ON legal_agreements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage legal agreements"
  ON legal_agreements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for agreement_acceptances
CREATE POLICY "Users can view their own acceptances"
  ON agreement_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can accept agreements"
  ON agreement_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for ip_violations
CREATE POLICY "Admins can view all violations"
  ON ip_violations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can report violations"
  ON ip_violations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Insert initial copyright notice
INSERT INTO legal_agreements (type, version, content, effective_date) VALUES
(
  'copyright_notice',
  '1.0.0',
  'All rights reserved. This educational rewards system, including but not limited to its concept, implementation, design, and associated materials, is protected by copyright law. The unauthorized reproduction or distribution of this intellectual property, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.',
  now()
);

-- Insert initial terms of service
INSERT INTO legal_agreements (type, version, content, effective_date) VALUES
(
  'terms_of_service',
  '1.0.0',
  'By using this platform, you agree to:
1. Not copy, modify, or distribute any part of the system without explicit written permission
2. Not reverse engineer or attempt to extract the source code
3. Not create derivative works or competing products
4. Not use the platform''s concepts or implementation details in other projects
5. Report any unauthorized use or intellectual property violations
Violation of these terms may result in immediate account termination and legal action.',
  now()
);

-- Create function to check agreement acceptance
CREATE OR REPLACE FUNCTION check_agreement_acceptance()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agreement_acceptances aa
    JOIN legal_agreements la ON aa.agreement_id = la.id
    WHERE aa.user_id = auth.uid()
    AND la.type IN ('terms_of_service', 'copyright_notice')
  ) THEN
    RAISE EXCEPTION 'User must accept terms of service and copyright notice';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;