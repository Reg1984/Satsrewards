/*
  # Fix RLS policies for schools table

  1. Changes
    - Drop existing policies first
    - Re-add RLS policies for schools table
    - Add proper policies for admin management and user access
    
  2. Security
    - Maintains RLS protection
    - Ensures proper access control
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage schools" ON schools;
    DROP POLICY IF EXISTS "Users can view their school" ON schools;
    DROP POLICY IF EXISTS "Anyone can view schools" ON schools;
    DROP POLICY IF EXISTS "School admins can manage schools" ON schools;
END $$;

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage schools
CREATE POLICY "admins_manage_schools"
ON schools
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow users to view their own school
CREATE POLICY "users_view_school"
ON schools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
  )
);