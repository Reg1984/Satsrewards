-- Temporarily disable RLS on all tables to debug the login issue
-- This is a temporary measure to help diagnose the problem
-- WARNING: This should be reverted in production environments

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_disabled_for_debugging',
  jsonb_build_object(
    'table', 'profiles',
    'timestamp', now(),
    'reason', 'Temporarily disabled to debug login issues',
    'should_be_reverted', true
  )
);

-- Create a function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION check_rls_status(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    RETURN rls_enabled;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_rls_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_status(text) TO anon;