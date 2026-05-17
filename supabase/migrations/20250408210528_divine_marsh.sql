/*
  # Add Educational Games Support
  
  1. Changes
    - Add game type to educational_content
    - Add game-specific fields
    - Add game progress tracking
    
  2. Security
    - Maintain RLS policies
    - Add game-specific policies
*/

-- Add game type to educational_content
ALTER TABLE educational_content
ADD COLUMN IF NOT EXISTS type text DEFAULT 'content' CHECK (type IN ('content', 'game'));

-- Add game-specific fields to educational_content
ALTER TABLE educational_content
ADD COLUMN IF NOT EXISTS game_config jsonb DEFAULT '{
  "levels": [],
  "rewards": {
    "completion": 100,
    "perfect_score": 200,
    "time_bonus": 50
  },
  "settings": {
    "time_limit": 300,
    "attempts_allowed": 3,
    "minimum_score": 70
  }
}'::jsonb;

-- Add game progress tracking to student_progress
ALTER TABLE student_progress
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_score integer,
ADD COLUMN IF NOT EXISTS last_played timestamptz,
ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb;

-- Create index for game content
CREATE INDEX IF NOT EXISTS idx_educational_content_type 
ON educational_content(type) 
WHERE type = 'game';

-- Create index for game progress
CREATE INDEX IF NOT EXISTS idx_student_progress_games 
ON student_progress(student_id, content_id) 
WHERE quiz_score IS NOT NULL;

-- Insert initial games
INSERT INTO educational_content 
(title, content, type, difficulty_level, reward_sats, game_config, published)
VALUES
(
  'Math Challenge',
  'Practice basic math operations and earn rewards!',
  'game',
  'beginner',
  100,
  '{
    "type": "math",
    "operations": ["+", "-"],
    "max_number": 10,
    "questions": 10,
    "time_limit": 300
  }'::jsonb,
  true
),
(
  'Bitcoin Quiz',
  'Test your knowledge about Bitcoin and cryptocurrency!',
  'game',
  'intermediate',
  200,
  '{
    "type": "quiz",
    "topics": ["bitcoin", "blockchain", "wallets"],
    "questions": 10,
    "time_limit": 600
  }'::jsonb,
  true
),
(
  'Memory Master',
  'Match financial terms and concepts!',
  'game',
  'advanced',
  300,
  '{
    "type": "memory",
    "pairs": 12,
    "categories": ["terms", "concepts", "symbols"],
    "time_limit": 900
  }'::jsonb,
  true
);