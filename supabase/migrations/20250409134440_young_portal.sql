/*
  # Add Test Data for Student Zaps
  
  1. Changes
    - Add test zaps between students
    - Use correct UUIDs that match existing profiles
    - Set appropriate timestamps
*/

-- Add some test zaps between students
INSERT INTO student_zaps (
  sender_id,
  receiver_id,
  amount_sats,
  reason,
  needs_approval,
  created_at
) 
SELECT 
  sender.id as sender_id,
  receiver.id as receiver_id,
  amount,
  reason,
  true as needs_approval,
  created_at
FROM (
  VALUES 
    ('alice@test.com', 'bob@test.com', 100, 'Thanks for helping with math homework!', now() - interval '2 days'),
    ('bob@test.com', 'charlie@test.com', 150, 'Great teamwork on the science project', now() - interval '1 day'),
    ('charlie@test.com', 'diana@test.com', 200, 'Thanks for the Bitcoin explanation!', now() - interval '12 hours'),
    ('diana@test.com', 'alice@test.com', 175, 'Excellent presentation help', now() - interval '6 hours')
) AS data(sender_email, receiver_email, amount, reason, created_at)
JOIN profiles sender ON sender.email = data.sender_email
JOIN profiles receiver ON receiver.email = data.receiver_email
ON CONFLICT DO NOTHING;