/*
  # Fix debug_logs RLS policies

  1. Changes
    - Drop existing policies on debug_logs table
    - Add new policies to allow:
      - Anonymous users to insert logs (for client-side errors before auth)
      - Authenticated users to insert and view their own logs
      - Admins to view all logs
      - Service role to bypass RLS (already configured at Supabase level)

  2. Security
    - Enable RLS on debug_logs table
    - Restrict users to only view their own logs
    - Allow admins full access
    - Allow anonymous logging for pre-auth errors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_anonymous_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "users_can_insert_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "users_can_view_own_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "admins_can_view_all_debug_logs" ON debug_logs;

-- Create new policies
CREATE POLICY "allow_anonymous_debug_logs"
ON debug_logs
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

CREATE POLICY "users_can_insert_debug_logs"
ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

CREATE POLICY "users_can_view_own_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN user_id IS NULL THEN false
    ELSE user_id = auth.uid()
  END
);

CREATE POLICY "admins_can_view_all_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);