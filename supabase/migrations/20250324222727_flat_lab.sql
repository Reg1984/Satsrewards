/*
  # Fix Profile Policies and Test User Setup

  1. Changes
    - Remove recursive policy that was causing infinite recursion
    - Add simplified policies for profile access
    - Add policy for initial profile creation during signup

  2. Security
    - Maintain RLS protection
    - Allow authenticated users to read their own profile
    - Allow new users to create their initial profile
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "teachers_can_view_safeguarding" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Enable read access for users to their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Enable update access for users to their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert access for authenticated users"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Add policy for teachers to view student profiles in their class
CREATE POLICY "Enable teachers to view their class profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
        AND
        class_id = (SELECT class_id FROM profiles WHERE id = auth.uid())
    );