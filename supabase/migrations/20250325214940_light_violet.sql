/*
  # School and Reward System Setup

  1. New Tables
    - `schools`
      - Basic school information and settings
      - Compliance status and requirements
    - `reward_rules`
      - Configurable reward rules per school/class
      - Point values and conditions
    - `withdrawals`
      - Student withdrawal requests
      - Parental approval tracking
    - `educational_content`
      - Bitcoin education modules
      - Progress tracking

  2. Security
    - Enable RLS on all tables
    - School admin access policies
    - Teacher access policies
    - Student access policies

  3. Changes
    - Add school_id to profiles table
    - Add parent approval fields for withdrawals
*/

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  country text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  subscription_tier text NOT NULL DEFAULT 'free',
  max_students integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{
    "minimum_withdrawal": 100,
    "require_parent_approval": true,
    "maximum_daily_rewards": 1000,
    "allowed_withdrawal_days": ["monday", "wednesday", "friday"]
  }'::jsonb,
  compliance_status jsonb DEFAULT '{
    "kyc_verified": false,
    "age_verification": false,
    "parent_consent_required": true
  }'::jsonb
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Reward rules table
CREATE TABLE IF NOT EXISTS reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  class_id text,
  name text NOT NULL,
  description text,
  sats_amount integer NOT NULL CHECK (sats_amount > 0),
  category text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (school_id, name)
);

ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  parent_approval boolean DEFAULT false,
  parent_email text,
  parent_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  lightning_invoice text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Educational content table
CREATE TABLE IF NOT EXISTS educational_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  reward_sats integer DEFAULT 0,
  quiz_questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;

-- Student progress tracking
CREATE TABLE IF NOT EXISTS student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  content_id uuid NOT NULL REFERENCES educational_content(id),
  completed boolean DEFAULT false,
  quiz_score integer,
  rewards_claimed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, content_id)
);

ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Add school_id to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- Security Policies

-- Schools
CREATE POLICY "Public schools are viewable by all users"
  ON schools FOR SELECT
  USING (true);

CREATE POLICY "School admins can update their school"
  ON schools FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = schools.id
  ));

-- Reward Rules
CREATE POLICY "Teachers can view their school's reward rules"
  ON reward_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = reward_rules.school_id
  ));

CREATE POLICY "Teachers can create reward rules"
  ON reward_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = reward_rules.school_id
  ));

-- Withdrawals
CREATE POLICY "Students can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can request withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (
    auth.uid() = student_id 
    AND status = 'pending'
  );

-- Educational Content
CREATE POLICY "Everyone can view published content"
  ON educational_content FOR SELECT
  USING (published = true);

CREATE POLICY "Teachers can manage educational content"
  ON educational_content FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  ));

-- Student Progress
CREATE POLICY "Students can view their own progress"
  ON student_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress"
  ON student_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_school ON reward_rules(school_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_student ON withdrawals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_content_updated_at
    BEFORE UPDATE ON educational_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();