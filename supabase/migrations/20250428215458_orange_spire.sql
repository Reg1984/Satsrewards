-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student',
  name text NOT NULL,
  class_id text,
  school_id uuid,
  image_url text,
  last_active timestamptz DEFAULT now(),
  consent_timestamp timestamptz,
  data_retention_approved boolean DEFAULT false,
  two_factor_enabled boolean DEFAULT false,
  password_last_changed timestamptz DEFAULT now(),
  failed_login_attempts integer DEFAULT 0,
  account_locked_until timestamptz,
  educational_credits integer DEFAULT 0,
  school_system text DEFAULT 'UK',
  primary_language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with DROP IF EXISTS first to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create debug_logs table for error logging
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for debug_logs
DROP POLICY IF EXISTS "Users can insert debug logs" ON debug_logs;
CREATE POLICY "Users can insert debug logs" ON debug_logs
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own debug logs" ON debug_logs;
CREATE POLICY "Users can view own debug logs" ON debug_logs
  FOR SELECT
  USING (
    CASE
      WHEN user_id IS NULL THEN false
      ELSE user_id = auth.uid()
    END
  );

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  country text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  subscription_tier text NOT NULL DEFAULT 'free',
  max_students integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{"minimum_withdrawal": 100, "maximum_daily_rewards": 1000, "allowed_withdrawal_days": ["monday", "wednesday", "friday"], "require_parent_approval": true}',
  school_balance integer DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schools
DROP POLICY IF EXISTS "Admins can insert schools" ON schools;
CREATE POLICY "Admins can insert schools" ON schools
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can update own school" ON schools;
CREATE POLICY "Admins can update own school" ON schools
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = schools.id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = schools.id
  ));

DROP POLICY IF EXISTS "Users can view own school" ON schools;
CREATE POLICY "Users can view own school" ON schools
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
  ));

-- Create awards table
CREATE TABLE IF NOT EXISTS awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  sats integer NOT NULL CHECK (sats > 0),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for awards
DROP POLICY IF EXISTS "Students can view own awards" ON awards;
CREATE POLICY "Students can view own awards" ON awards
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can create awards" ON awards;
CREATE POLICY "Teachers can create awards" ON awards
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = awards.student_id
  ));

DROP POLICY IF EXISTS "Teachers can view class awards" ON awards;
CREATE POLICY "Teachers can view class awards" ON awards
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = awards.student_id
  ));

-- Create behavior_records table
CREATE TABLE IF NOT EXISTS behavior_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('positive', 'negative')),
  category text NOT NULL,
  points integer NOT NULL CHECK (points <> 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Enable Row Level Security
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for behavior_records
DROP POLICY IF EXISTS "Students can view own behavior" ON behavior_records;
CREATE POLICY "Students can view own behavior" ON behavior_records
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage behavior" ON behavior_records;
CREATE POLICY "Teachers can manage behavior" ON behavior_records
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = behavior_records.student_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = behavior_records.student_id
  ));

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'late', 'absent', 'authorized')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  UNIQUE(student_id, date)
);

-- Enable Row Level Security
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
CREATE POLICY "Students can view own attendance" ON attendance
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
CREATE POLICY "Teachers can manage attendance" ON attendance
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = attendance.student_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = attendance.student_id
  ));

-- Create reward_rules table
CREATE TABLE IF NOT EXISTS reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  class_id text,
  name text NOT NULL,
  description text,
  sats_amount integer NOT NULL CHECK (sats_amount > 0),
  category text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  UNIQUE(school_id, name)
);

-- Enable Row Level Security
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reward_rules
DROP POLICY IF EXISTS "Admins can manage all rules" ON reward_rules;
CREATE POLICY "Admins can manage all rules" ON reward_rules
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = reward_rules.school_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = reward_rules.school_id
  ));

DROP POLICY IF EXISTS "Teachers can create class rules" ON reward_rules;
CREATE POLICY "Teachers can create class rules" ON reward_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.school_id = reward_rules.school_id
      AND (reward_rules.class_id IS NULL OR profiles.class_id = reward_rules.class_id)
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Teachers can delete own rules" ON reward_rules;
CREATE POLICY "Teachers can delete own rules" ON reward_rules
  FOR DELETE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.school_id = reward_rules.school_id
    )
  );

DROP POLICY IF EXISTS "Teachers can update own rules" ON reward_rules;
CREATE POLICY "Teachers can update own rules" ON reward_rules
  FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.school_id = reward_rules.school_id
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.school_id = reward_rules.school_id
    )
  );

DROP POLICY IF EXISTS "Teachers can view school rules" ON reward_rules;
CREATE POLICY "Teachers can view school rules" ON reward_rules
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
    AND profiles.school_id = reward_rules.school_id
  ));

-- Create student_zaps table
CREATE TABLE IF NOT EXISTS student_zaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  amount_sats integer NOT NULL CHECK (amount_sats > 0 AND amount_sats <= 1000),
  reason text NOT NULL,
  needs_approval boolean DEFAULT true,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  CHECK (sender_id <> receiver_id)
);

-- Enable Row Level Security
ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_zaps
DROP POLICY IF EXISTS "Students can create zaps" ON student_zaps;
CREATE POLICY "Students can create zaps" ON student_zaps
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

DROP POLICY IF EXISTS "Students can view own zaps" ON student_zaps;
CREATE POLICY "Students can view own zaps" ON student_zaps
  FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can approve zaps" ON student_zaps;
CREATE POLICY "Teachers can approve zaps" ON student_zaps
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles sender ON sender.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND sender.id = student_zaps.sender_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles sender ON sender.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND sender.id = student_zaps.sender_id
  ));

DROP POLICY IF EXISTS "Teachers can view class zaps" ON student_zaps;
CREATE POLICY "Teachers can view class zaps" ON student_zaps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      JOIN profiles sender ON sender.class_id = teacher.class_id
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND sender.id = student_zaps.sender_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles teacher
      JOIN profiles receiver ON receiver.class_id = teacher.class_id
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND receiver.id = student_zaps.receiver_id
    )
  );

-- Create lightning_transactions table
CREATE TABLE IF NOT EXISTS lightning_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  lightning_invoice text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  type text DEFAULT 'withdrawal' CHECK (type IN ('withdrawal', 'deposit', 'school_funding')),
  school_id uuid REFERENCES schools(id)
);

-- Enable Row Level Security
ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lightning_transactions
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON lightning_transactions;
CREATE POLICY "Users can create withdrawal requests" ON lightning_transactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND type = 'withdrawal'
  );

DROP POLICY IF EXISTS "Users can view own transactions" ON lightning_transactions;
CREATE POLICY "Users can view own transactions" ON lightning_transactions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can create school funding" ON lightning_transactions;
CREATE POLICY "Staff can create school funding" ON lightning_transactions
  FOR INSERT
  WITH CHECK (
    type = 'school_funding'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
      AND profiles.school_id = lightning_transactions.school_id
    )
  );

DROP POLICY IF EXISTS "Staff can view school funding" ON lightning_transactions;
CREATE POLICY "Staff can view school funding" ON lightning_transactions
  FOR SELECT
  USING (
    type = 'school_funding'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
      AND profiles.school_id = lightning_transactions.school_id
    )
  );

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  parent_approval boolean DEFAULT false,
  parent_email text,
  parent_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  lightning_invoice text,
  metadata jsonb DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for withdrawals
DROP POLICY IF EXISTS "Students can create withdrawals" ON withdrawals;
CREATE POLICY "Students can create withdrawals" ON withdrawals
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Students can view own withdrawals" ON withdrawals;
CREATE POLICY "Students can view own withdrawals" ON withdrawals
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can approve withdrawals" ON withdrawals;
CREATE POLICY "Teachers can approve withdrawals" ON withdrawals
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  ));

DROP POLICY IF EXISTS "Teachers can view class withdrawals" ON withdrawals;
CREATE POLICY "Teachers can view class withdrawals" ON withdrawals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = withdrawals.student_id
  ));

-- Create educational_content table
CREATE TABLE IF NOT EXISTS educational_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  reward_sats integer DEFAULT 0,
  quiz_questions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  type text DEFAULT 'content' CHECK (type IN ('content', 'game'))
);

-- Enable Row Level Security
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for educational_content
DROP POLICY IF EXISTS "Staff can manage content" ON educational_content;
CREATE POLICY "Staff can manage content" ON educational_content
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  ));

DROP POLICY IF EXISTS "Users can view published content" ON educational_content;
CREATE POLICY "Users can view published content" ON educational_content
  FOR SELECT
  USING (published = true);

-- Create student_progress table
CREATE TABLE IF NOT EXISTS student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  content_id uuid NOT NULL REFERENCES educational_content(id),
  completed boolean DEFAULT false,
  quiz_score integer,
  rewards_claimed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  attempts integer DEFAULT 0,
  best_score integer,
  last_played timestamptz,
  achievements jsonb DEFAULT '[]',
  UNIQUE(student_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_progress
DROP POLICY IF EXISTS "Students can view own progress" ON student_progress;
CREATE POLICY "Students can view own progress" ON student_progress
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own progress" ON student_progress;
CREATE POLICY "Students can update own progress" ON student_progress
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can modify own progress" ON student_progress;
CREATE POLICY "Students can modify own progress" ON student_progress
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view class progress" ON student_progress;
CREATE POLICY "Teachers can view class progress" ON student_progress
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = student_progress.student_id
  ));

-- Create parent_messages table
CREATE TABLE IF NOT EXISTS parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for parent_messages
DROP POLICY IF EXISTS "Users can send messages" ON parent_messages;
CREATE POLICY "Users can send messages" ON parent_messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own messages" ON parent_messages;
CREATE POLICY "Users can view own messages" ON parent_messages
  FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view class messages" ON parent_messages;
CREATE POLICY "Teachers can view class messages" ON parent_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles teacher
    JOIN profiles student ON student.class_id = teacher.class_id
    WHERE teacher.id = auth.uid()
    AND teacher.role = 'teacher'
    AND student.id = parent_messages.student_id
  ));

-- Create function to update updated_at columns if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if trigger exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schools_updated_at') THEN
        CREATE TRIGGER update_schools_updated_at
        BEFORE UPDATE ON schools
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Check if trigger exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_educational_content_updated_at') THEN
        CREATE TRIGGER update_educational_content_updated_at
        BEFORE UPDATE ON educational_content
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert test users if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'teacher@test.com') THEN
        INSERT INTO profiles (id, email, role, name, class_id, educational_credits)
        VALUES 
            ('00000000-0000-0000-0000-000000000001', 'teacher@test.com', 'teacher', 'Test Teacher', '10A', 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'student@test.com') THEN
        INSERT INTO profiles (id, email, role, name, class_id, educational_credits)
        VALUES 
            ('00000000-0000-0000-0000-000000000002', 'student@test.com', 'student', 'Test Student', '10A', 500);
    END IF;
END $$;