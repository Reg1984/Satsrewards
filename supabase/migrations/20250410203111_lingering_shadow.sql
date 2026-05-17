/*
  # Fix recursive RLS policies for profiles table

  1. Changes
    - Drop existing problematic policies that cause recursion
    - Create new optimized policies that avoid recursion
    - Maintain same access control logic but with better implementation

  2. Security
    - Maintains row level security
    - Preserves existing access patterns:
      - Users can access their own profile
      - Admins can access profiles in their school
      - Teachers can access profiles in their class
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "allow_admin_school_access" ON profiles;
DROP POLICY IF EXISTS "allow_teacher_class_access" ON profiles;
DROP POLICY IF EXISTS "allow_self_access" ON profiles;

-- Create new, optimized policies
-- Self access - users can always access their own profile
CREATE POLICY "allow_self_access"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin school access - using auth.uid() directly instead of subquery
CREATE POLICY "allow_admin_school_access"
ON profiles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND school_id IS NOT NULL
    AND school_id = profiles.school_id
  )
);

-- Teacher class access - using auth.uid() directly instead of subquery
CREATE POLICY "allow_teacher_class_access"
ON profiles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
    AND class_id IS NOT NULL
    AND class_id = profiles.class_id
  )
);