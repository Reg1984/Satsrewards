/*
  # Add Missing Tables and Columns

  ## Summary
  Several tables and columns referenced in the application are missing from the database.
  This migration adds them all.

  ## New Tables
  1. `student_zaps` - Peer-to-peer SATs transfers between students/teachers
  2. `parent_messages` - Messaging between teachers, parents, and students
  3. `student_invitation_codes` - Invitation codes for students to join schools
  4. `debug_logs` - Application error and info logging
  5. `timetable_events` - Teacher timetable / class schedule events

  ## Modified Tables
  - `schools`: add `school_balance` integer column (default 0)
  - `lightning_transactions`: add `type` text column

  ## Notes
  - `student_statistics` already exists as a materialized view, skipped
  - RLS enabled on all new tables with ownership-scoped policies
*/

-- ─── schools: add school_balance ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'school_balance'
  ) THEN
    ALTER TABLE schools ADD COLUMN school_balance integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── lightning_transactions: add type ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lightning_transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE lightning_transactions ADD COLUMN type text NOT NULL DEFAULT 'withdrawal';
  END IF;
END $$;

-- ─── student_zaps ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_zaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  reason text NOT NULL DEFAULT '',
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  needs_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view zaps they sent or received"
  ON student_zaps FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create zaps as sender"
  ON student_zaps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Approvers can update zaps"
  ON student_zaps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- ─── parent_messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  student_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
  ON parent_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages as themselves"
  ON parent_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
  ON parent_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ─── student_invitation_codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  code text NOT NULL UNIQUE,
  class_id text,
  email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid REFERENCES profiles(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student_invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view invitation codes"
  ON student_invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND school_id = student_invitation_codes.school_id
        AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "School admins can create invitation codes"
  ON student_invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND school_id = student_invitation_codes.school_id
        AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "School admins can delete invitation codes"
  ON student_invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND school_id = student_invitation_codes.school_id
        AND role IN ('admin', 'teacher')
    )
  );

-- ─── debug_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own debug logs"
  ON debug_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all debug logs"
  ON debug_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── timetable_events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id),
  class_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  recurrence_rule text,
  color text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE timetable_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own timetable events"
  ON timetable_events FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create timetable events"
  ON timetable_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own timetable events"
  ON timetable_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own timetable events"
  ON timetable_events FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);
