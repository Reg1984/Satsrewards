/*
  # Add Student-to-Student Reward System

  1. New Tables
    - `student_zaps`: Track student-to-student rewards
      - Who sent the zap
      - Who received it
      - Amount
      - Reason
      - Teacher approval status

  2. Security
    - Enable RLS
    - Add policies for students to send/receive zaps
    - Add policies for teachers to approve zaps
*/

CREATE TABLE IF NOT EXISTS student_zaps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES profiles(id) NOT NULL,
    receiver_id uuid REFERENCES profiles(id) NOT NULL,
    amount_sats integer NOT NULL CHECK (amount_sats > 0 AND amount_sats <= 1000),
    reason text NOT NULL,
    needs_approval boolean DEFAULT true,
    approved boolean DEFAULT false,
    approved_by uuid REFERENCES profiles(id),
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Prevent self-zaps
    CONSTRAINT no_self_zaps CHECK (sender_id != receiver_id)
);

-- Enable RLS
ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_student_zaps_sender ON student_zaps(sender_id, created_at DESC);
CREATE INDEX idx_student_zaps_receiver ON student_zaps(receiver_id, created_at DESC);

-- RLS Policies

-- Students can create zaps
CREATE POLICY "Students can create zaps"
    ON student_zaps
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'student'
        )
    );

-- Students can view their sent/received zaps
CREATE POLICY "Students can view their zaps"
    ON student_zaps
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = sender_id
        OR auth.uid() = receiver_id
    );

-- Teachers can approve zaps
CREATE POLICY "Teachers can approve zaps"
    ON student_zaps
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('teacher', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('teacher', 'admin')
        )
    );