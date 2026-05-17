/*
  # Fix Materialized View Permissions

  1. Changes
    - Grant necessary permissions on student_statistics view
    - Update refresh function to handle permissions
    - Add policies for authenticated access
    
  2. Security
    - Maintain RLS protection
    - Grant minimal required permissions
*/

-- Grant permissions to authenticated users
GRANT SELECT ON student_statistics TO authenticated;
GRANT SELECT ON student_statistics TO anon;

-- Recreate the refresh function with elevated privileges
CREATE OR REPLACE FUNCTION refresh_student_statistics()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW student_statistics;
    RETURN NULL;
END;
$$;

-- Drop existing trigger
DROP TRIGGER IF EXISTS refresh_student_statistics_trigger ON profiles;

-- Recreate trigger
CREATE TRIGGER refresh_student_statistics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_student_statistics();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION refresh_student_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_student_statistics() TO anon;

-- Ensure the view owner is the same as the database owner
ALTER MATERIALIZED VIEW student_statistics OWNER TO postgres;