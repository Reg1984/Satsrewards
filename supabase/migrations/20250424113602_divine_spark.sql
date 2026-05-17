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

-- Create a function to test auth functionality
CREATE OR REPLACE FUNCTION debug_test_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    v_user_id uuid;
    v_user_role text;
    v_user_email text;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO v_user_id;
    
    -- Get user role from profiles
    SELECT role, email INTO v_user_role, v_user_email
    FROM profiles
    WHERE id = v_user_id;
    
    -- Build result
    SELECT jsonb_build_object(
        'auth_uid', v_user_id,
        'user_exists', (SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id)),
        'profile_exists', (SELECT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id)),
        'user_role', v_user_role,
        'user_email', v_user_email,
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
GRANT EXECUTE ON FUNCTION debug_test_auth() TO authenticated;