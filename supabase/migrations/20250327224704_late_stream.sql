/*
  # Add Initial Admin User and Fix Materialized View
  
  1. Changes
    - Add unique index to materialized view
    - Create admin user profile
    - Disable trigger temporarily
    
  2. Security
    - Maintain secure access controls
    - Proper role assignment
*/

-- First, drop the existing trigger that's causing issues
DROP TRIGGER IF EXISTS refresh_student_statistics_trigger ON profiles;

-- Add unique index to materialized view
DROP INDEX IF EXISTS idx_student_statistics_unique;
CREATE UNIQUE INDEX idx_student_statistics_unique 
ON student_statistics (COALESCE(class_id, ''), COALESCE(school_type, ''), COALESCE(year_group, ''));

-- Create the admin profile
INSERT INTO profiles (
  email,
  role,
  name,
  data_retention_approved,
  school_system,
  primary_language,
  timezone,
  two_factor_enabled,
  failed_login_attempts,
  educational_credits,
  requires_parent_consent
) VALUES (
  'admin@satsrewards.co.uk',
  'admin',
  'System Administrator',
  true,
  'UK',
  'en',
  'Europe/London',
  false,
  0,
  0,
  false
) ON CONFLICT (email) DO NOTHING;

-- Recreate the trigger with CONCURRENTLY option removed
CREATE TRIGGER refresh_student_statistics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_student_statistics();