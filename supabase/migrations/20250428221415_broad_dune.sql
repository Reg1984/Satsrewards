/*
  # Update debug_logs RLS policies

  1. Changes
    - Add new RLS policies to allow service role and authenticated users to insert logs
    - Add policy for admins to view all logs
    - Add policy for users to view their own logs
    - Add policy for anonymous users to insert logs without user_id

  2. Security
    - Maintains data isolation between users
    - Allows system-level logging for debugging
    - Preserves audit trail capabilities
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_can_insert_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "users_can_view_own_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "admins_can_view_all_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "allow_anonymous_debug_logs" ON debug_logs;

-- Create new policies with proper permissions
CREATE POLICY "users_can_insert_debug_logs"
ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL) OR (user_id = auth.uid())
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

CREATE POLICY "allow_anonymous_debug_logs"
ON debug_logs
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

-- Ensure RLS is enabled
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;