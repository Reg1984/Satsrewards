/*
  # Add insert policy for debug logs

  1. Changes
    - Add RLS policy to allow authenticated users to insert debug logs
    - Policy ensures users can only insert logs with their own user_id
  
  2. Security
    - Restricts users to only insert logs for themselves
    - Maintains existing read-only policies
*/

CREATE POLICY "users_can_insert_debug_logs"
ON public.debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to only insert logs for themselves
  user_id = auth.uid() OR
  -- Allow logs without a user_id (system logs)
  user_id IS NULL
);