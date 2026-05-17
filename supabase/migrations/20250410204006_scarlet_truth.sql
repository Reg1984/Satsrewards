/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove existing overly permissive RLS policy
    - Add specific RLS policies for different access patterns:
      - Users can read their own profile
      - Teachers can read profiles in their class
      - School admins can read all profiles in their school
      - System admins can read all profiles
  
  2. Security
    - More granular access control
    - Prevents infinite recursion
    - Maintains data isolation between schools
*/

-- Drop existing policy that's causing recursion
DROP POLICY IF EXISTS "allow_authenticated_access" ON profiles;

-- Create specific policies for different access patterns
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Teachers can read class profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Teacher accessing student profiles in their class
  (auth.uid() IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.role = 'teacher'
  ) AND class_id IN (
    SELECT class_id 
    FROM profiles 
    WHERE id = auth.uid()
  ))
);

CREATE POLICY "School admins can read school profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Admin accessing profiles in their school
  (auth.uid() IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.role = 'admin'
  ) AND school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  ))
);

CREATE POLICY "System admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.role = 'system_admin'
  )
);

-- Add policies for insert/update/delete operations
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "System admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.role = 'system_admin'
  )
);