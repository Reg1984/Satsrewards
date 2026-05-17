/*
  # Fix Materialized View Permissions

  1. Changes
    - Drop and recreate student_statistics view with proper permissions
    - Update refresh function to use service role
    - Grant necessary permissions to authenticated users
    
  2. Security
    - Maintain RLS protection
    - Use service role for refresh operations
*/

-- Drop existing view and related objects
DROP MATERIALIZED VIEW IF EXISTS student_statistics;
DROP FUNCTION IF EXISTS refresh_student_statistics() CASCADE;

-- Recreate materialized view
CREATE MATERIALIZED VIEW student_statistics AS
SELECT
    school_system,
    class_id,
    school_type,
    year_group,
    COUNT(*) as student_count,
    COUNT(*) FILTER (WHERE send_status = true) as send_count,
    COUNT(*) FILTER (WHERE safeguarding_flag = true) as safeguarding_count,
    AVG(educational_credits) as avg_credits
FROM profiles
WHERE role = 'student'
GROUP BY school_system, class_id, school_type, year_group;

-- Create index for better performance
CREATE UNIQUE INDEX idx_student_statistics_unique 
ON student_statistics (
    COALESCE(school_system, ''),
    COALESCE(class_id, ''),
    COALESCE(school_type, ''),
    COALESCE(year_group, '')
);

-- Create refresh function with service role privileges
CREATE OR REPLACE FUNCTION refresh_student_statistics()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY student_statistics;
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to non-concurrent refresh if concurrent fails
        REFRESH MATERIALIZED VIEW student_statistics;
        RETURN NULL;
END;
$$;

-- Create trigger for automatic refresh
CREATE TRIGGER refresh_student_statistics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_student_statistics();

-- Grant permissions
GRANT SELECT ON student_statistics TO authenticated;
GRANT SELECT ON student_statistics TO anon;
GRANT EXECUTE ON FUNCTION refresh_student_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_student_statistics() TO anon;

-- Set ownership to postgres role
ALTER MATERIALIZED VIEW student_statistics OWNER TO postgres;

-- Refresh the view initially
REFRESH MATERIALIZED VIEW student_statistics;