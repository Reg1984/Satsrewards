/*
  # Fix debug logs RLS policies

  1. Changes
    - Add RLS policies for debug_logs table to allow:
      - Authenticated users to insert logs
      - Users to view their own logs
      - Admins to view all logs

  2. Security
    - Enable RLS on debug_logs table
    - Add policies for insert and select operations
    - Restrict access based on user role and ownership
*/

-- Enable RLS on debug_logs table if not already enabled
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    -- Check if policies exist before attempting to drop them
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'debug_logs' AND policyname = 'users_can_insert_debug_logs'
    ) THEN
        DROP POLICY users_can_insert_debug_logs ON debug_logs;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'debug_logs' AND policyname = 'users_can_view_own_debug_logs'
    ) THEN
        DROP POLICY users_can_view_own_debug_logs ON debug_logs;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'debug_logs' AND policyname = 'admins_can_view_all_debug_logs'
    ) THEN
        DROP POLICY admins_can_view_all_debug_logs ON debug_logs;
    END IF;
END $$;

-- Allow authenticated users to insert debug logs
CREATE POLICY "users_can_insert_debug_logs"
ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) OR (user_id IS NULL)
);

-- Allow users to view their own debug logs
CREATE POLICY "users_can_view_own_debug_logs"
ON debug_logs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Allow admins to view all debug logs
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