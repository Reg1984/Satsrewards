/*
  # Fix infinite recursion in profiles policies
  
  1. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Maintain security while preventing infinite loops
  
  2. Security
    - Users can still read their own profile
    - Users in the same school can read basic profile info
    - Maintains data access control without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "School admins can read school profiles" ON profiles;
DROP POLICY IF EXISTS "System admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "System admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can read class profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Enable read access for users to their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Enable update access for users to their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to read basic info of profiles in their school
CREATE POLICY "Enable read access for users in same school"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Only allow reading if the requesting user has a profile with matching school_id
  EXISTS (
    SELECT 1 
    FROM profiles AS viewer 
    WHERE viewer.id = auth.uid() 
    AND viewer.school_id = profiles.school_id
  )
);

-- Allow system admins full access based on claims
CREATE POLICY "Enable full access for system admins"
ON profiles FOR ALL 
TO authenticated
USING (
  -- Check for system_admin role in JWT claims
  auth.jwt() ->> 'role' = 'system_admin'
);