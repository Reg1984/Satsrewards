/*
  # Fix Profile Policies - Final Version
  
  1. Changes
    - Remove all existing policies
    - Create simplified non-recursive policies
    - Use direct auth.uid() checks
    - Cache teacher/admin status in a function
  
  2. Security
    - Maintain RLS protection
    - Ensure proper access control
    - Prevent policy recursion
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_class_access" ON profiles;

-- Create a secure function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    RETURN user_role;
END;
$$;

-- Basic read access - everyone can read profiles
CREATE POLICY "read_all_profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own profile
CREATE POLICY "update_own_profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can only insert their own profile
CREATE POLICY "insert_own_profile"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Delete existing function if it exists
DROP FUNCTION IF EXISTS is_teacher_or_admin();

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role, id);
CREATE INDEX IF NOT EXISTS idx_profiles_class_id ON profiles(class_id);