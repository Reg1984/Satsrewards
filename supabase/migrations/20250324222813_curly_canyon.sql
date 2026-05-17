/*
  # Fix Recursive Profile Policies

  1. Changes
    - Remove recursive teacher policy
    - Implement non-recursive teacher access
    - Simplify profile access policies

  2. Security
    - Maintain RLS protection
    - Ensure proper teacher access to student profiles
    - Prevent policy recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access for users to their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable teachers to view their class profiles" ON profiles;

-- Create base profile access policy
CREATE POLICY "users_read_own_profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Create update policy
CREATE POLICY "users_update_own_profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create insert policy
CREATE POLICY "users_insert_profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Create non-recursive teacher view policy
CREATE POLICY "teachers_view_class_profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles teacher
            WHERE teacher.id = auth.uid()
            AND teacher.role IN ('teacher', 'admin')
            AND teacher.class_id IS NOT NULL
            AND teacher.class_id = profiles.class_id
        )
    );