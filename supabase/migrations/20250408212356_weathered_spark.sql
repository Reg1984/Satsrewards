/*
  # School and Student Activation System
  
  1. New Tables
    - `school_activation_codes`: Track school registration codes
    - `student_invitation_codes`: Track student invitations
    
  2. Changes
    - Add activation tracking to schools table
    - Add invitation tracking to profiles
    
  3. Security
    - Enable RLS
    - Add policies for secure access
*/

-- Create school activation codes table
CREATE TABLE IF NOT EXISTS school_activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  school_id uuid REFERENCES schools(id),
  subscription_tier text NOT NULL DEFAULT 'free',
  max_students integer NOT NULL DEFAULT 100,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create student invitation codes table
CREATE TABLE IF NOT EXISTS student_invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  school_id uuid REFERENCES schools(id) NOT NULL,
  class_id text,
  email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add activation fields to schools
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS activation_required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS activation_code text UNIQUE,
ADD COLUMN IF NOT EXISTS activation_expires_at timestamptz;

-- Enable RLS
ALTER TABLE school_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invitation_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_activation_codes_code ON school_activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_student_invitation_codes_code ON student_invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_student_invitation_codes_school ON student_invitation_codes(school_id, expires_at);

-- RLS Policies

-- School activation codes
CREATE POLICY "Only system can manage activation codes"
  ON school_activation_codes
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Student invitation codes
CREATE POLICY "Teachers can create student invites"
  ON student_invitation_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
      AND school_id = student_invitation_codes.school_id
    )
  );

CREATE POLICY "Teachers can view their school's invites"
  ON student_invitation_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
      AND school_id = student_invitation_codes.school_id
    )
  );

-- Create functions for code generation and validation
CREATE OR REPLACE FUNCTION generate_secure_code(length integer DEFAULT 8)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new school activation code
CREATE OR REPLACE FUNCTION create_school_activation_code(
  p_subscription_tier text DEFAULT 'free',
  p_max_students integer DEFAULT 100,
  p_expires_in interval DEFAULT interval '30 days'
)
RETURNS text AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate unique code
  LOOP
    v_code := generate_secure_code(12);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM school_activation_codes WHERE code = v_code
    );
  END LOOP;

  -- Insert new activation code
  INSERT INTO school_activation_codes (
    code,
    subscription_tier,
    max_students,
    expires_at
  ) VALUES (
    v_code,
    p_subscription_tier,
    p_max_students,
    now() + p_expires_in
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create student invitation codes
CREATE OR REPLACE FUNCTION create_student_invitations(
  p_school_id uuid,
  p_count integer DEFAULT 1,
  p_class_id text DEFAULT NULL
)
RETURNS SETOF text AS $$
DECLARE
  v_code text;
  i integer;
BEGIN
  FOR i IN 1..p_count LOOP
    -- Generate unique code
    LOOP
      v_code := generate_secure_code(8);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM student_invitation_codes WHERE code = v_code
      );
    END LOOP;

    -- Insert invitation code
    INSERT INTO student_invitation_codes (
      code,
      school_id,
      class_id,
      created_by
    ) VALUES (
      v_code,
      p_school_id,
      p_class_id,
      auth.uid()
    );

    RETURN NEXT v_code;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;