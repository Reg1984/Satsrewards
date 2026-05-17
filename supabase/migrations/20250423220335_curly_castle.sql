/*
  # Update debug_logs RLS policies

  1. Changes
    - Add policy to allow unauthenticated users to insert debug logs
    - Modify existing policies to handle null user_id

  2. Security
    - Maintains existing read restrictions
    - Allows error logging for both authenticated and unauthenticated users
    - Preserves admin access to all logs
*/

-- Allow unauthenticated users to insert logs
CREATE POLICY "allow_anonymous_debug_logs"
ON debug_logs
FOR INSERT
TO anon
WITH CHECK (
  -- Allow inserts with null user_id for anonymous users
  user_id IS NULL
);

-- Update existing insert policy for authenticated users to be more permissive
DROP POLICY IF EXISTS "users_can_insert_debug_logs" ON debug_logs;
CREATE POLICY "users_can_insert_debug_logs"
ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to insert their own logs or anonymous logs
  user_id IS NULL OR user_id = auth.uid()
);

-- Keep existing select policies but update them to handle null user_id
DROP POLICY IF EXISTS "users_can_view_own_debug_logs" ON debug_logs;
CREATE POLICY "users_can_view_own_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  -- Users can view their own logs
  CASE 
    WHEN user_id IS NULL THEN false  -- Anonymous logs require admin access
    ELSE user_id = auth.uid()
  END
);

-- Keep admin policy unchanged as it already works correctly
DROP POLICY IF EXISTS "admins_can_view_all_debug_logs" ON debug_logs;
CREATE POLICY "admins_can_view_all_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);