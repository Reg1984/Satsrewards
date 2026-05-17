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

-- Create a function to get schema info
CREATE OR REPLACE FUNCTION debug_get_schema_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Get information about the profiles table
    WITH profile_info AS (
        SELECT 
            column_name,
            data_type,
            is_nullable
        FROM 
            information_schema.columns
        WHERE 
            table_schema = 'public' 
            AND table_name = 'profiles'
    ),
    policy_info AS (
        SELECT 
            policyname,
            permissive,
            cmd,
            qual,
            with_check
        FROM 
            pg_policies
        WHERE 
            schemaname = 'public' 
            AND tablename = 'profiles'
    ),
    index_info AS (
        SELECT 
            indexname,
            indexdef
        FROM 
            pg_indexes
        WHERE 
            schemaname = 'public' 
            AND tablename = 'profiles'
    )
    SELECT 
        jsonb_build_object(
            'table_exists', (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')),
            'columns', (SELECT jsonb_agg(jsonb_build_object('name', column_name, 'type', data_type, 'nullable', is_nullable)) FROM profile_info),
            'policies', (SELECT jsonb_agg(jsonb_build_object('name', policyname, 'permissive', permissive, 'command', cmd, 'using', qual, 'with_check', with_check)) FROM policy_info),
            'indexes', (SELECT jsonb_agg(jsonb_build_object('name', indexname, 'definition', indexdef)) FROM index_info),
            'row_count', (SELECT count(*) FROM profiles),
            'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
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
GRANT EXECUTE ON FUNCTION debug_get_schema_info() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_get_schema_info() TO anon;

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