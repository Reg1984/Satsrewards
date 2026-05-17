/*
  # Restore RLS Policies
  
  1. Changes
    - Re-enable RLS on all tables
    - Add appropriate policies for each table
    - Maintain security while allowing necessary access
*/

-- Re-enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Teachers can view their class profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid()
      AND teacher.role IN ('teacher', 'admin')
      AND teacher.class_id = profiles.class_id
    )
  );

-- Schools policies
CREATE POLICY "Anyone can view schools"
  ON schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage schools"
  ON schools FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Awards policies
CREATE POLICY "Students can view their own awards"
  ON awards FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage awards"
  ON awards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Attendance policies
CREATE POLICY "Students can view their own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Behavior records policies
CREATE POLICY "Students can view their own behavior records"
  ON behavior_records FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage behavior records"
  ON behavior_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Educational content policies
CREATE POLICY "Anyone can view published content"
  ON educational_content FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Teachers can manage content"
  ON educational_content FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Student progress policies
CREATE POLICY "Students can view their own progress"
  ON student_progress FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress"
  ON student_progress FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Withdrawals policies
CREATE POLICY "Students can manage their own withdrawals"
  ON withdrawals FOR ALL
  TO authenticated
  USING (student_id = auth.uid());

-- Student zaps policies
CREATE POLICY "Students can view their zaps"
  ON student_zaps FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Students can send zaps"
  ON student_zaps FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Lightning transactions policies
CREATE POLICY "Users can view their own transactions"
  ON lightning_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON lightning_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Parent messages policies
CREATE POLICY "Users can view their messages"
  ON parent_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON parent_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Parent notifications policies
CREATE POLICY "Parents can view notifications"
  ON parent_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = student_id
      AND parent_email = auth.email()
    )
  );

-- Security logs policies
CREATE POLICY "Users can view their own security logs"
  ON security_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Two factor secrets policies
CREATE POLICY "Users can manage their own 2FA"
  ON two_factor_secrets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());