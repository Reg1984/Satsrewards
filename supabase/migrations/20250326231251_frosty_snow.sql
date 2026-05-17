/*
  # Add Student Images and School Access Management
  
  1. Changes
    - Add image_url to profiles table
    - Add subscription fields to schools table
    - Add school activation tracking
    
  2. Security
    - Maintain RLS policies
    - Add subscription status checks
*/

-- Add image_url to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS image_url text;

-- Add subscription and activation fields to schools
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'trial', 'active', 'suspended')),
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS activation_code text,
ADD COLUMN IF NOT EXISTS activated_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days');

-- Create school activation logs
CREATE TABLE IF NOT EXISTS school_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) NOT NULL,
    activation_code text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'activated', 'expired')),
    created_at timestamptz DEFAULT now(),
    activated_at timestamptz,
    created_by uuid REFERENCES profiles(id),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE school_activations ENABLE ROW LEVEL SECURITY;

-- Create policies for school activations
CREATE POLICY "School admins can view their activation"
    ON school_activations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.school_id = school_activations.school_id
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_activations_code ON school_activations(activation_code);
CREATE INDEX IF NOT EXISTS idx_schools_activation_code ON schools(activation_code);