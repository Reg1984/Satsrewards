/*
  # Add Lightning wallet support

  1. New Tables
    - `lightning_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `amount_sats` (integer)
      - `lightning_invoice` (text)
      - `status` (text) - pending, completed, failed
      - `created_at` (timestamp)
      - `completed_at` (timestamp)
      
  2. Security
    - Enable RLS on `lightning_transactions` table
    - Add policy for users to view their own transactions
    - Add policy for users to create withdrawal requests
*/

CREATE TABLE IF NOT EXISTS lightning_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  lightning_invoice text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own transactions" 
  ON lightning_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
  ON lightning_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'
  );