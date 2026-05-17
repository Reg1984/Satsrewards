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
WITH CHECK (user_id IS NULL);

CREATE POLICY "users_can_insert_debug_logs"
ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

CREATE POLICY "users_can_view_own_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
CASE
    WHEN (user_id IS NULL) THEN false
    ELSE (user_id = auth.uid())
END);

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