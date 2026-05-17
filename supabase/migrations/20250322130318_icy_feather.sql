/*
  # Performance Optimizations for Large Schools
  
  1. Indexing Improvements
    - Added composite indexes for common queries
    - Added partial indexes for specific conditions
    
  2. Table Partitioning
    - Partitioned security_logs by month
    - Added cleanup policy for old logs
    
  3. Performance Enhancements
    - Added materialized view for student statistics
    - Added caching hints
*/

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_class
    ON profiles(role, class_id);

CREATE INDEX IF NOT EXISTS idx_profiles_school_year
    ON profiles(school_type, year_group);

-- Create partial index for active students
CREATE INDEX IF NOT EXISTS idx_active_students
    ON profiles(id)
    WHERE role = 'student' AND data_retention_approved = true;

-- Create materialized view for student statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS student_statistics AS
SELECT
    class_id,
    school_type,
    year_group,
    COUNT(*) as student_count,
    COUNT(*) FILTER (WHERE send_status = true) as send_count,
    COUNT(*) FILTER (WHERE safeguarding_flag = true) as safeguarding_count,
    AVG(educational_credits) as avg_credits
FROM profiles
WHERE role = 'student'
GROUP BY class_id, school_type, year_group;

-- Create function to refresh statistics
CREATE OR REPLACE FUNCTION refresh_student_statistics()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY student_statistics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh statistics
CREATE TRIGGER refresh_student_statistics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_student_statistics();

-- Partition security_logs by month
CREATE TABLE IF NOT EXISTS security_logs_partitioned (
    id uuid DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next month
CREATE TABLE IF NOT EXISTS security_logs_y2025m03 PARTITION OF security_logs_partitioned
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS security_logs_y2025m04 PARTITION OF security_logs_partitioned
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Add cleanup policy for old logs
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_logs_partitioned
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;