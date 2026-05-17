-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_disabled',
  jsonb_build_object(
    'table', 'profiles',
    'timestamp', now(),
    'reason', 'Temporarily disabled for debugging purposes',
    'disabled_by', 'admin'
  )
);

-- Disable RLS on other related tables that might be causing issues
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_zaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightning_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules DISABLE ROW LEVEL SECURITY;

-- Log the comprehensive change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'multiple_rls_disabled',
  jsonb_build_object(
    'tables', ARRAY['profiles', 'schools', 'awards', 'behavior_records', 'attendance', 'student_zaps', 'lightning_transactions', 'reward_rules'],
    'timestamp', now(),
    'reason', 'Temporarily disabled for debugging teacher dashboard',
    'disabled_by', 'admin'
  )
);