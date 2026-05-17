/*
  # Create Timetable Events Table
  
  1. New Tables
    - `timetable_events`: Store teacher's timetable events
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references profiles)
      - `title` (text)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `class_id` (text, optional)
      - `location` (text, optional)
      - `description` (text, optional)
      - `event_type` (text) - class, meeting, exam, other
      - `recurrence_rule` (text, optional) - iCalendar RRULE format
      - `all_day` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `metadata` (jsonb)
      
  2. Security
    - Enable RLS on timetable_events table
    - Add policies for teachers to manage their own events
    - Add policies for admins to view all events
*/

-- Create timetable_events table
CREATE TABLE IF NOT EXISTS timetable_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  class_id text,
  location text,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('class', 'meeting', 'exam', 'other')),
  recurrence_rule text,
  all_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Ensure end time is after start time
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE timetable_events ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at column
CREATE TRIGGER update_timetable_events_updated_at
  BEFORE UPDATE ON timetable_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_timetable_events_teacher_id ON timetable_events(teacher_id);
CREATE INDEX idx_timetable_events_class_id ON timetable_events(class_id);
CREATE INDEX idx_timetable_events_date_range ON timetable_events(start_time, end_time);

-- Create RLS policies
-- Teachers can manage their own events
CREATE POLICY "teachers_can_manage_own_events"
  ON timetable_events
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can view events for classes they teach
CREATE POLICY "teachers_can_view_class_events"
  ON timetable_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.class_id = timetable_events.class_id
    )
  );

-- Admins can view all events in their school
CREATE POLICY "admins_can_view_all_events"
  ON timetable_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      JOIN profiles admin ON admin.school_id = teacher.school_id
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND teacher.id = timetable_events.teacher_id
    )
  );

-- Insert some sample data for testing
INSERT INTO timetable_events (
  teacher_id,
  title,
  start_time,
  end_time,
  class_id,
  location,
  description,
  event_type
)
SELECT 
  p.id,
  'Mathematics Class',
  now() + interval '1 day' + interval '9 hours',
  now() + interval '1 day' + interval '10 hours',
  p.class_id,
  'Room 101',
  'Regular mathematics class for ' || p.class_id,
  'class'
FROM profiles p
WHERE p.role = 'teacher'
LIMIT 1;

INSERT INTO timetable_events (
  teacher_id,
  title,
  start_time,
  end_time,
  class_id,
  location,
  description,
  event_type,
  recurrence_rule
)
SELECT 
  p.id,
  'Weekly Science Class',
  now() + interval '2 days' + interval '11 hours',
  now() + interval '2 days' + interval '12 hours',
  p.class_id,
  'Science Lab',
  'Weekly science class with experiments',
  'class',
  'FREQ=WEEKLY;BYDAY=WE;COUNT=10'
FROM profiles p
WHERE p.role = 'teacher'
LIMIT 1;

INSERT INTO timetable_events (
  teacher_id,
  title,
  start_time,
  end_time,
  location,
  description,
  event_type
)
SELECT 
  p.id,
  'Staff Meeting',
  now() + interval '3 days' + interval '15 hours',
  now() + interval '3 days' + interval '16 hours',
  'Conference Room',
  'Weekly staff meeting to discuss progress',
  'meeting'
FROM profiles p
WHERE p.role = 'teacher'
LIMIT 1;

INSERT INTO timetable_events (
  teacher_id,
  title,
  start_time,
  end_time,
  class_id,
  location,
  description,
  event_type
)
SELECT 
  p.id,
  'End of Term Exam',
  now() + interval '5 days' + interval '10 hours',
  now() + interval '5 days' + interval '12 hours',
  p.class_id,
  'Exam Hall',
  'End of term mathematics examination',
  'exam'
FROM profiles p
WHERE p.role = 'teacher'
LIMIT 1;