-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "users_can_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "teachers_can_view_class_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_can_view_school_profiles" ON profiles;
DROP POLICY IF EXISTS "enable_all_access_to_authenticated_users" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop existing policies on schools table
DROP POLICY IF EXISTS "Admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Admins can update own school" ON schools;
DROP POLICY IF EXISTS "Users can view own school" ON schools;
DROP POLICY IF EXISTS "admins_manage_schools" ON schools;
DROP POLICY IF EXISTS "users_view_school" ON schools;

-- Drop existing policies on awards table
DROP POLICY IF EXISTS "Students can view own awards" ON awards;
DROP POLICY IF EXISTS "Teachers can create awards" ON awards;
DROP POLICY IF EXISTS "Teachers can view class awards" ON awards;
DROP POLICY IF EXISTS "students_can_view_own_awards" ON awards;
DROP POLICY IF EXISTS "teachers_can_create_awards" ON awards;
DROP POLICY IF EXISTS "teachers_can_view_class_awards" ON awards;

-- Drop existing policies on attendance table
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
DROP POLICY IF EXISTS "teachers_can_manage_attendance" ON attendance;
DROP POLICY IF EXISTS "students_can_view_own_attendance" ON attendance;

-- Drop existing policies on behavior_records table
DROP POLICY IF EXISTS "Teachers can manage behavior" ON behavior_records;
DROP POLICY IF EXISTS "Students can view own behavior" ON behavior_records;
DROP POLICY IF EXISTS "teachers_can_manage_behavior" ON behavior_records;
DROP POLICY IF EXISTS "students_can_view_own_behavior" ON behavior_records;

-- Drop existing policies on lightning_transactions table
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON lightning_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON lightning_transactions;
DROP POLICY IF EXISTS "Staff can create school funding" ON lightning_transactions;
DROP POLICY IF EXISTS "Staff can view school funding" ON lightning_transactions;
DROP POLICY IF EXISTS "users_can_create_withdrawal_requests" ON lightning_transactions;
DROP POLICY IF EXISTS "users_can_view_own_transactions" ON lightning_transactions;
DROP POLICY IF EXISTS "staff_can_create_school_funding" ON lightning_transactions;
DROP POLICY IF EXISTS "staff_can_view_school_funding" ON lightning_transactions;

-- Re-enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for profiles table
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Teachers can view class profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles teacher WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND teacher.class_id = profiles.class_id));
CREATE POLICY "Admins can view school profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles admin WHERE admin.id = auth.uid() AND admin.role = 'admin' AND admin.school_id = profiles.school_id));

-- Re-enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for schools table
CREATE POLICY "Users can view own school" ON schools FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.school_id = schools.id));
CREATE POLICY "Admins can manage own school" ON schools FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.school_id = schools.id)) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.school_id = schools.id));
CREATE POLICY "Admins can insert schools" ON schools FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Re-enable RLS on awards table
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for awards table
CREATE POLICY "Students can view own awards" ON awards FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can create awards" ON awards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = awards.student_id));
CREATE POLICY "Teachers can view class awards" ON awards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = awards.student_id));

-- Re-enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for attendance table
CREATE POLICY "Students can view own attendance" ON attendance FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage attendance" ON attendance FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = attendance.student_id)) WITH CHECK (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = attendance.student_id));

-- Re-enable RLS on behavior_records table
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for behavior_records table
CREATE POLICY "Students can view own behavior" ON behavior_records FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage behavior" ON behavior_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = behavior_records.student_id)) WITH CHECK (EXISTS (SELECT 1 FROM profiles teacher JOIN profiles student ON student.class_id = teacher.class_id WHERE teacher.id = auth.uid() AND teacher.role = 'teacher' AND student.id = behavior_records.student_id));

-- Re-enable RLS on lightning_transactions table
ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies for lightning_transactions table
CREATE POLICY "Users can create withdrawal requests" ON lightning_transactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (type = 'withdrawal'::text));
CREATE POLICY "Users can view own transactions" ON lightning_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can create school funding" ON lightning_transactions FOR INSERT TO authenticated WITH CHECK (((type = 'school_funding'::text) AND EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['teacher'::text, 'admin'::text])) AND (profiles.school_id = lightning_transactions.school_id)))));
CREATE POLICY "Staff can view school funding" ON lightning_transactions FOR SELECT TO authenticated USING (((type = 'school_funding'::text) AND EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['teacher'::text, 'admin'::text])) AND (profiles.school_id = lightning_transactions.school_id)))));

-- Re-enable RLS on debug_logs table
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on debug_logs table
DROP POLICY IF EXISTS "users_can_insert_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "users_can_view_own_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "admins_can_view_all_debug_logs" ON debug_logs;
DROP POLICY IF EXISTS "allow_anonymous_debug_logs" ON debug_logs;

-- Create policies for debug_logs
CREATE POLICY "users_can_insert_debug_logs" ON debug_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL) OR (user_id = auth.uid())
);

CREATE POLICY "users_can_view_own_debug_logs" ON debug_logs
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN (user_id IS NULL) THEN false
    ELSE (user_id = auth.uid())
  END
);

CREATE POLICY "admins_can_view_all_debug_logs" ON debug_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "allow_anonymous_debug_logs" ON debug_logs
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

-- Log the change
INSERT INTO debug_logs (event_type, details)
VALUES (
  'rls_policies_consolidated',
  jsonb_build_object(
    'timestamp', now(),
    'description', 'Consolidated RLS policies to fix authentication issues',
    'tables_affected', ARRAY['profiles', 'schools', 'awards', 'attendance', 'behavior_records', 'lightning_transactions', 'debug_logs']
  )
);