/*
  # Add attendance and behavior tracking

  1. New Tables
    - `attendance`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles)
      - `date` (date)
      - `status` (text: present, late, absent, authorized)
      - `notes` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles)
    
    - `behavior_records`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles)
      - `type` (text: positive, negative)
      - `category` (text)
      - `points` (integer)
      - `notes` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles)

  2. Security
    - Enable RLS on both tables
    - Add policies for teachers to manage records
    - Add policies for students to view their own records
*/

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'late', 'absent', 'authorized')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  UNIQUE(student_id, date)
);

-- Create behavior records table
CREATE TABLE IF NOT EXISTS behavior_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('positive', 'negative')),
  category text NOT NULL,
  points integer NOT NULL CHECK (points != 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;

-- Attendance policies
CREATE POLICY "Teachers can manage attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Students can view own attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Behavior policies
CREATE POLICY "Teachers can manage behavior records"
  ON behavior_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Students can view own behavior records"
  ON behavior_records
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Create indexes
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date DESC);
CREATE INDEX idx_behavior_student_date ON behavior_records(student_id, created_at DESC);
CREATE INDEX idx_behavior_type_date ON behavior_records(type, created_at DESC);