/*
  # Fix student_statistics materialized view for concurrent refresh

  The materialized view lacked a unique index required for CONCURRENT refresh.
  This adds a unique index on (class_id, school_type, year_group) so the trigger
  can refresh it without errors.
*/

CREATE UNIQUE INDEX IF NOT EXISTS student_statistics_unique_idx
  ON student_statistics (class_id, school_type, year_group);
