/*
  # Add Custodial Wallet Support
  
  1. New Tables
    - `custodial_wallets`: Store custodial wallet information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `wallet_address` (text)
      - `wallet_public_key` (text)
      - `wallet_key_id` (text) - Reference to the key in Supabase Vault
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `custodial_transactions`: Track all transactions related to custodial wallets
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `transaction_type` (text) - deposit, withdrawal, transfer
      - `amount_sats` (integer)
      - `transaction_hash` (text, optional)
      - `created_at` (timestamptz)
      - `status` (text) - pending, completed, failed
      - `recipient_id` (uuid, optional, references profiles)
      - `metadata` (jsonb)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for secure access
*/

-- Create custodial_wallets table
CREATE TABLE IF NOT EXISTS custodial_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) UNIQUE,
  wallet_address text NOT NULL,
  wallet_public_key text NOT NULL,
  wallet_key_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  balance_sats integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create custodial_transactions table
CREATE TABLE IF NOT EXISTS custodial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'award')),
  amount_sats integer NOT NULL CHECK (amount_sats > 0),
  transaction_hash text,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  recipient_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE custodial_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodial_transactions ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_custodial_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custodial_wallets_updated_at
  BEFORE UPDATE ON custodial_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_custodial_wallets_updated_at();

-- Create RLS policies for custodial_wallets
CREATE POLICY "Users can view own custodial wallet"
  ON custodial_wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all custodial wallets"
  ON custodial_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create RLS policies for custodial_transactions
CREATE POLICY "Users can view own custodial transactions"
  ON custodial_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Admins can view all custodial transactions"
  ON custodial_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view class custodial transactions"
  ON custodial_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      JOIN profiles student ON student.class_id = teacher.class_id
      WHERE teacher.id = auth.uid()
      AND teacher.role = 'teacher'
      AND (student.id = custodial_transactions.user_id OR student.id = custodial_transactions.recipient_id)
    )
  );

-- Create function to handle custodial wallet balance updates
CREATE OR REPLACE FUNCTION update_custodial_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' THEN
    -- Handle different transaction types
    CASE NEW.transaction_type
      -- For deposits, add to the user's balance
      WHEN 'deposit' THEN
        UPDATE custodial_wallets
        SET balance_sats = balance_sats + NEW.amount_sats
        WHERE user_id = NEW.user_id;
      
      -- For withdrawals, subtract from the user's balance
      WHEN 'withdrawal' THEN
        UPDATE custodial_wallets
        SET balance_sats = balance_sats - NEW.amount_sats
        WHERE user_id = NEW.user_id;
      
      -- For transfers, subtract from sender and add to recipient
      WHEN 'transfer' THEN
        -- Subtract from sender
        UPDATE custodial_wallets
        SET balance_sats = balance_sats - NEW.amount_sats
        WHERE user_id = NEW.user_id;
        
        -- Add to recipient
        UPDATE custodial_wallets
        SET balance_sats = balance_sats + NEW.amount_sats
        WHERE user_id = NEW.recipient_id;
        
      -- For awards, add to the recipient's balance
      WHEN 'award' THEN
        UPDATE custodial_wallets
        SET balance_sats = balance_sats + NEW.amount_sats
        WHERE user_id = NEW.recipient_id;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for custodial wallet balance updates
CREATE TRIGGER update_custodial_wallet_balance_trigger
  AFTER INSERT OR UPDATE OF status ON custodial_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_custodial_wallet_balance();

-- Create indexes for better performance
CREATE INDEX idx_custodial_wallets_user_id ON custodial_wallets(user_id);
CREATE INDEX idx_custodial_transactions_user_id ON custodial_transactions(user_id);
CREATE INDEX idx_custodial_transactions_recipient_id ON custodial_transactions(recipient_id);
CREATE INDEX idx_custodial_transactions_status ON custodial_transactions(status);