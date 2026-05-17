/*
  # Create Awards Table

  1. New Tables
    - `awards`: Student achievement records
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles)
      - `sats` (integer)
      - `reason` (text)
      - `created_at` (timestamp)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS
    - Add policies for students to read their own awards
    - Add policies for teachers to manage awards
*/

CREATE TABLE IF NOT EXISTS awards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES profiles(id) NOT NULL,
    sats integer NOT NULL CHECK (sats > 0),
    reason text NOT NULL,
    created_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Students can read their own awards
CREATE POLICY "Students can view their own awards"
    ON awards
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Teachers can manage awards for their class
CREATE POLICY "Teachers can manage awards"
    ON awards
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role = 'teacher' OR role = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles teacher
            WHERE teacher.id = auth.uid()
            AND (teacher.role = 'teacher' OR teacher.role = 'admin')
            AND EXISTS (
                SELECT 1 FROM profiles student
                WHERE student.id = awards.student_id
                AND student.class_id = teacher.class_id
            )
        )
    );

-- Create index for better performance
CREATE INDEX idx_awards_student_id_created_at 
    ON awards(student_id, created_at DESC);