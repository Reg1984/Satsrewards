-- First, disable RLS temporarily on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on profiles table
DO $$ 
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, non-recursive policies
CREATE POLICY "users_can_read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
ON profiles(id, role, class_id, school_id);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_policies_updated',
  jsonb_build_object(
    'table', 'profiles',
    'timestamp', now(),
    'policies', array[
      'users_can_read_own_profile',
      'users_can_update_own_profile',
      'users_can_insert_own_profile'
    ],
    'description', 'Simplified RLS policies to fix login error'
  )
);

-- Create a function to debug schema access issues
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