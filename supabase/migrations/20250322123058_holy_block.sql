/*
  # Security Enhancements for UK School Compliance

  1. New Tables
    - `profiles`: Core user profiles table
      - `id` (uuid, primary key)
      - `email` (text)
      - `role` (text)
      - `name` (text)
      - `class_id` (text, optional)
      - `last_active` (timestamp)
      - `consent_timestamp` (timestamp, optional)
      - `data_retention_approved` (boolean)
      
    - `security_logs`: Audit trail for security events
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `event_type` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
    
    - `two_factor_secrets`: Store TOTP secrets
      - `user_id` (uuid, primary key, references profiles)
      - `secret` (text, encrypted)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security Features
    - Two-factor authentication support
    - Password change tracking
    - Failed login attempt monitoring
    - Account locking capability
    - Security event logging
    
  3. Security
    - Enable RLS on all tables
    - Add policies for secure access
*/

-- Create profiles table first
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'student',
    name text NOT NULL,
    class_id text,
    last_active timestamptz DEFAULT now(),
    consent_timestamp timestamptz,
    data_retention_approved boolean DEFAULT false,
    two_factor_enabled boolean DEFAULT false,
    password_last_changed timestamptz DEFAULT now(),
    failed_login_attempts integer DEFAULT 0,
    account_locked_until timestamptz
);

-- Create security logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create two factor secrets table
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    user_id uuid PRIMARY KEY REFERENCES profiles(id),
    secret text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Security logs policies
CREATE POLICY "Users can read their own security logs"
    ON security_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert security logs"
    ON security_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Two factor secrets policies
CREATE POLICY "Users can manage their own 2FA secrets"
    ON two_factor_secrets
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for two_factor_secrets
CREATE TRIGGER update_two_factor_secrets_updated_at
    BEFORE UPDATE ON two_factor_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id_created_at 
    ON security_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
    ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role 
    ON profiles(role);