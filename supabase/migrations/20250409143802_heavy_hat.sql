/*
  # Add Test Data with Fixed Behavior Records Query
  
  1. Changes
    - Fix behavior records type reference
    - Maintain all other functionality
*/

DO $$
DECLARE
  v_teacher_id uuid := '8f9e6f32-0e30-4d05-8bb5-5d0a293e6e92';
  v_alice_id uuid := 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d';
  v_bob_id uuid := 'b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e';
  v_charlie_id uuid := 'c3d4e5f6-a7b8-6c9d-0e1f-2a3b4c5d6e7f';
  v_diana_id uuid := 'd4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f89';
  v_school_id uuid := 'e52f9c74-6222-4961-8092-a975fca787c9';
  v_result record;
  v_behavior_type text;
  v_points integer;
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

  -- Create or update teacher profile first
  SELECT * INTO v_result FROM profiles WHERE email = 'teacher@test.com';
  
  IF v_result.id IS NULL THEN
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
    ) VALUES (
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
    );
  ELSE
    UPDATE profiles SET
      name = 'Ms. Johnson',
      image_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      class_id = 'class-12A',
      school_id = v_school_id
    WHERE id = v_result.id;
  END IF;

  -- Create student profiles
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
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    image_url = EXCLUDED.image_url,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    educational_credits = EXCLUDED.educational_credits;

  -- Verify all profiles were created
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id IN (v_teacher_id, v_alice_id, v_bob_id, v_charlie_id, v_diana_id)
  ) THEN
    RAISE EXCEPTION 'Failed to create all required profiles';
  END IF;

  -- Add initial awards
  INSERT INTO awards (
    student_id,
    sats,
    reason,
    created_at
  )
  SELECT 
    p.id,
    1000,
    'Initial test balance',
    now() - interval '1 day'
  FROM profiles p
  WHERE p.role = 'student' 
  AND p.id IN (v_alice_id, v_bob_id, v_charlie_id, v_diana_id)
  ON CONFLICT DO NOTHING;

  -- Add test zaps
  INSERT INTO student_zaps (
    sender_id,
    receiver_id,
    amount_sats,
    reason,
    needs_approval,
    approved,
    approved_by,
    approved_at,
    created_at
  )
  SELECT v_alice_id, v_bob_id, 100, 'Thanks for helping with math homework!', true, true, v_teacher_id, now() - interval '2 hours', now() - interval '3 hours'
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = v_alice_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = v_bob_id)
  UNION ALL
  SELECT v_bob_id, v_charlie_id, 150, 'Great teamwork on the science project', true, true, v_teacher_id, now() - interval '1 hour', now() - interval '2 hours'
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = v_bob_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = v_charlie_id)
  UNION ALL
  SELECT v_charlie_id, v_diana_id, 200, 'Thanks for the Bitcoin explanation!', true, false, null, null, now() - interval '1 hour'
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = v_charlie_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = v_diana_id)
  UNION ALL
  SELECT v_diana_id, v_alice_id, 175, 'Excellent presentation help', true, false, null, null, now() - interval '30 minutes'
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = v_diana_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = v_alice_id);

  -- Add test attendance records
  INSERT INTO attendance (
    student_id,
    date,
    status,
    created_at,
    created_by
  )
  SELECT DISTINCT
    p.id as student_id,
    current_date - (n || ' days')::interval as date,
    CASE (random() * 4)::int
      WHEN 0 THEN 'present'
      WHEN 1 THEN 'late'
      WHEN 2 THEN 'absent'
      ELSE 'authorized'
    END as status,
    now() - (n || ' days')::interval as created_at,
    (SELECT id FROM profiles WHERE email = 'teacher@test.com') as created_by
  FROM 
    profiles p,
    generate_series(0, 10) n
  WHERE 
    p.role = 'student'
    AND p.id IN (v_alice_id, v_bob_id, v_charlie_id, v_diana_id)
  ON CONFLICT DO NOTHING;

  -- Add test behavior records
  FOR i IN 0..5 LOOP
    -- Determine behavior type and points
    IF random() > 0.5 THEN
      v_behavior_type := 'positive';
      v_points := 5;
    ELSE
      v_behavior_type := 'negative';
      v_points := -3;
    END IF;

    -- Insert behavior records for each student
    INSERT INTO behavior_records (
      student_id,
      type,
      category,
      points,
      created_at,
      created_by
    )
    SELECT 
      p.id,
      v_behavior_type,
      CASE (random() * 3)::int
        WHEN 0 THEN 'Participation'
        WHEN 1 THEN 'Homework'
        WHEN 2 THEN 'Behavior'
        ELSE 'Attendance'
      END,
      v_points,
      now() - (i || ' days')::interval,
      (SELECT id FROM profiles WHERE email = 'teacher@test.com')
    FROM profiles p
    WHERE p.role = 'student'
    AND p.id IN (v_alice_id, v_bob_id, v_charlie_id, v_diana_id);
  END LOOP;

END $$;