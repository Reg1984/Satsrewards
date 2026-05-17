/*
  # Add Test Data for Zap Feature Testing
  
  1. Create test school and users with proper UUIDs
  2. Add initial balance for testing
*/

-- Create a test school
INSERT INTO schools (id, name, country, timezone, subscription_status, subscription_tier)
VALUES (
  gen_random_uuid(),
  'Test School',
  'UK',
  'Europe/London',
  'active',
  'free'
);

-- Store the school ID for reference
DO $$ 
DECLARE
  v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM schools ORDER BY created_at DESC LIMIT 1;

  -- Create test student profiles
  INSERT INTO profiles (
    id,
    email,
    role,
    name,
    class_id,
    school_id,
    data_retention_approved,
    school_system,
    primary_language
  ) VALUES 
  -- Student 1 (Alice)
  (
    gen_random_uuid(),
    'alice@test.com',
    'student',
    'Alice Thompson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en'
  ),
  -- Student 2 (Bob)
  (
    gen_random_uuid(),
    'bob@test.com',
    'student',
    'Bob Wilson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en'
  ),
  -- Student 3 (Charlie)
  (
    gen_random_uuid(),
    'charlie@test.com',
    'student',
    'Charlie Brown',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en'
  );

  -- Add a test teacher
  INSERT INTO profiles (
    id,
    email,
    role,
    name,
    class_id,
    school_id,
    data_retention_approved,
    school_system,
    primary_language
  ) VALUES (
    gen_random_uuid(),
    'teacher@test.com',
    'teacher',
    'Ms. Johnson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en'
  );

  -- Give students some initial balance
  INSERT INTO awards (
    student_id,
    sats,
    reason
  )
  SELECT 
    id,
    1000,
    'Initial test balance'
  FROM profiles 
  WHERE role = 'student' 
  AND email IN ('alice@test.com', 'bob@test.com', 'charlie@test.com');

END $$;