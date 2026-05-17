-- Add UK curriculum subjects to educational_content
INSERT INTO educational_content 
(title, content, type, difficulty_level, reward_sats, quiz_questions, published)
VALUES
-- English
(
  'English Literature Quiz',
  'Test your knowledge of English literature and earn rewards!',
  'game',
  'intermediate',
  150,
  '[
    {
      "question": "Which of these is a play by William Shakespeare?",
      "options": ["Macbeth", "Pride and Prejudice", "Great Expectations", "The Canterbury Tales"],
      "correct_answer": 0
    },
    {
      "question": "What type of poem is a sonnet?",
      "options": ["14 lines", "10 lines", "8 lines", "12 lines"],
      "correct_answer": 0
    }
  ]'::jsonb,
  true
),
-- Mathematics
(
  'GCSE Mathematics Quiz',
  'Practice key mathematical concepts and earn rewards!',
  'game',
  'intermediate',
  150,
  '[
    {
      "question": "What is the formula for the area of a circle?",
      "options": ["πr²", "2πr", "πd", "r²"],
      "correct_answer": 0
    },
    {
      "question": "Solve: 2x + 5 = 13",
      "options": ["x = 4", "x = 6", "x = 3", "x = 5"],
      "correct_answer": 0
    }
  ]'::jsonb,
  true
),
-- Science
(
  'GCSE Science Quiz',
  'Test your knowledge of key scientific concepts!',
  'game',
  'intermediate',
  150,
  '[
    {
      "question": "What is the chemical symbol for gold?",
      "options": ["Au", "Ag", "Fe", "Cu"],
      "correct_answer": 0
    },
    {
      "question": "Which organelle is known as the powerhouse of the cell?",
      "options": ["Mitochondria", "Nucleus", "Ribosome", "Golgi Body"],
      "correct_answer": 0
    }
  ]'::jsonb,
  true
),
-- Geography
(
  'Geography Quiz',
  'Test your knowledge of geography and earn rewards!',
  'game',
  'intermediate',
  150,
  '[
    {
      "question": "What is the capital city of the United Kingdom?",
      "options": ["London", "Edinburgh", "Cardiff", "Belfast"],
      "correct_answer": 0
    },
    {
      "question": "Which is the longest river in the UK?",
      "options": ["River Severn", "River Thames", "River Trent", "River Great Ouse"],
      "correct_answer": 0
    }
  ]'::jsonb,
  true
),
-- History
(
  'History Quiz',
  'Test your knowledge of key historical events!',
  'game',
  'intermediate',
  150,
  '[
    {
      "question": "When did World War II end?",
      "options": ["1945", "1944", "1946", "1943"],
      "correct_answer": 0
    },
    {
      "question": "Who was the first Tudor monarch?",
      "options": ["Henry VII", "Henry VIII", "Elizabeth I", "Mary I"],
      "correct_answer": 0
    }
  ]'::jsonb,
  true
);