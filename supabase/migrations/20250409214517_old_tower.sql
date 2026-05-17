-- Create test users with passwords
DO $$
DECLARE
  v_teacher_id uuid := '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92';
  v_alice_id uuid := 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d';
  v_bob_id uuid := 'b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e';
  v_charlie_id uuid := 'c3d4e5f6-a7b8-6c9d-0e1f-2a3b4c5d6e7f';
  v_diana_id uuid := 'd4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f89';
  v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
BEGIN
  -- Create test school
  INSERT INTO schools (
    id,
    name,
    country,
    timezone,
    subscription_status,
    subscription_tier,
    max_students
  ) VALUES (
    v_school_id,
    'Test School',
    'UK',
    'Europe/London',
    'active',
    'free',
    100
  ) ON CONFLICT (id) DO NOTHING;

  -- Create test profiles
  INSERT INTO profiles (
    id,
    email,
    role,
    name,
    class_id,
    school_id,
    data_retention_approved,
    school_system,
    primary_language,
    educational_credits,
    requires_parent_consent,
    image_url
  ) VALUES 
  -- Test Teacher
  (
    v_teacher_id,
    'teacher@test.com',
    'teacher',
    'Ms. Johnson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en',
    0,
    false,
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
  ),
  -- Student 1 (Alice)
  (
    v_alice_id,
    'alice@test.com',
    'student',
    'Alice Thompson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en',
    1000,
    false,
    'https://images.unsplash.com/photo-1517841905240-472988babdf9'
  ),
  -- Student 2 (Bob)
  (
    v_bob_id,
    'bob@test.com',
    'student',
    'Bob Wilson',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en',
    1000,
    false,
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6'
  ),
  -- Student 3 (Charlie)
  (
    v_charlie_id,
    'charlie@test.com',
    'student',
    'Charlie Brown',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en',
    1000,
    false,
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12'
  ),
  -- Student 4 (Diana)
  (
    v_diana_id,
    'diana@test.com',
    'student',
    'Diana Martinez',
    'class-12A',
    v_school_id,
    true,
    'UK',
    'en',
    1000,
    false,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
  )
  ON CONFLICT (email) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    image_url = EXCLUDED.image_url,
    educational_credits = EXCLUDED.educational_credits;

  -- Give initial awards to students
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
  AND id IN (v_alice_id, v_bob_id, v_charlie_id, v_diana_id)
  ON CONFLICT DO NOTHING;

END $$;