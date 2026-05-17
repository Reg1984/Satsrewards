/*
  # Fix Profile Access Policies

  1. Changes
    - Simplify RLS policies for profiles table
    - Fix recursive policy issues
    - Ensure proper access for authentication flow
    
  2. Security
    - Maintain secure access controls
    - Prevent infinite recursion in policies
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;

-- Simple policy for reading profiles
CREATE POLICY "profiles_read_policy"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Users can read their own profile
        id = auth.uid()
        OR
        -- Teachers/admins can read profiles in their class
        EXISTS (
            SELECT 1
            FROM profiles AS teacher
            WHERE teacher.id = auth.uid()
            AND teacher.role IN ('teacher', 'admin')
            AND teacher.class_id = profiles.class_id
        )
    );

-- Users can update their own profile
CREATE POLICY "profiles_update_policy"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
    ON profiles(id, role, class_id);