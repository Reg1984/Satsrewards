/*
  # Fix Profile Policies

  1. Changes
    - Remove existing policies causing recursion
    - Create new simplified policies for profiles table
    - Add proper indexes for performance

  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Users can read and update their own profile
      - Teachers can read profiles in their class
      - Users can insert their own profile during signup
*/

-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_read_class" ON profiles;
DROP POLICY IF EXISTS "profiles_read_self" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
DROP POLICY IF EXISTS "allow_read_own" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_read" ON profiles;
DROP POLICY IF EXISTS "allow_update_own" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "profiles_read_own"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_read_class"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles teacher
            WHERE teacher.id = auth.uid()
            AND teacher.role IN ('teacher', 'admin')
            AND teacher.class_id = profiles.class_id
        )
    );

CREATE POLICY "profiles_update_own"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Recreate indexes for better performance
DROP INDEX IF EXISTS idx_profiles_role_class;
DROP INDEX IF EXISTS idx_profiles_id_role;

CREATE INDEX IF NOT EXISTS idx_profiles_role_class ON profiles(role, class_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);