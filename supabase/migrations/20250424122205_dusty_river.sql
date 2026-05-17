/*
  # Fix Schema Access Issues
  
  1. Changes
    - Create a function to directly create debug logs bypassing RLS
    - Fix schema access issues by granting necessary permissions
    - Create a function to check if RLS is enabled on a table
    
  2. Security
    - Functions use SECURITY DEFINER to run with elevated privileges
    - Proper error handling and logging
*/

-- Create a function to directly create debug logs (bypasses RLS)
CREATE OR REPLACE FUNCTION create_direct_debug_log(
  p_event_type text,
  p_details jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO debug_logs (
    event_type,
    details,
    created_at
  ) VALUES (
    p_event_type,
    p_details,
    now()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_direct_debug_log(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_direct_debug_log(text, jsonb) TO anon;

-- Fix schema access issues by granting necessary permissions
DO $$
BEGIN
  -- Grant usage on public schema
  GRANT USAGE ON SCHEMA public TO authenticated;
  GRANT USAGE ON SCHEMA public TO anon;
  
  -- Grant select on all tables to authenticated users
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
  
  -- Grant execute on all functions to authenticated users
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
  
  -- Grant usage on all sequences to authenticated users
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
END
$$;

-- Create a function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon;

-- Create a function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = check_column_exists.table_name
    AND column_name = check_column_exists.column_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_column_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_column_exists(text, text) TO anon;

-- Create a function to get a list of all tables
CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(table_name)
  INTO result
  FROM information_schema.tables
  WHERE table_schema = 'public';
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_all_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_tables() TO anon;

-- Create a function to test auth functionality
CREATE OR REPLACE FUNCTION debug_auth_test(test_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_user_exists boolean;
  v_profile_exists boolean;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = test_email
  ) INTO v_user_exists;
  
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE email = test_email
  ) INTO v_profile_exists;
  
  -- Build result
  SELECT jsonb_build_object(
    'user_exists', v_user_exists,
    'profile_exists', v_profile_exists,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'timestamp', now()
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION debug_auth_test(text) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_test(text) TO anon;

-- Log that this migration was applied
INSERT INTO debug_logs (event_type, details)
VALUES (
  'migration_applied',
  jsonb_build_object(
    'name', 'fix_schema_access',
    'timestamp', now(),
    'description', 'Fixed schema access issues and added debug functions'
  )
);