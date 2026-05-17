-- Add school_balance column to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS school_balance integer DEFAULT 0;

-- Add type column to lightning_transactions
ALTER TABLE lightning_transactions
ADD COLUMN IF NOT EXISTS type text DEFAULT 'withdrawal' CHECK (type IN ('withdrawal', 'deposit', 'school_funding'));

-- Add school_id column to lightning_transactions
ALTER TABLE lightning_transactions
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- Create function to handle school funding
CREATE OR REPLACE FUNCTION handle_school_funding()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process newly completed school funding transactions
  IF NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.type = 'school_funding' THEN
    -- Update school balance
    UPDATE schools
    SET school_balance = school_balance + NEW.amount_sats
    WHERE id = NEW.school_id;
    
    -- Log the funding
    INSERT INTO debug_logs (
      event_type,
      user_id,
      details
    ) VALUES (
      'school_funding',
      NEW.user_id,
      jsonb_build_object(
        'school_id', NEW.school_id,
        'amount', NEW.amount_sats,
        'transaction_id', NEW.id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for school funding
DROP TRIGGER IF EXISTS school_funding_trigger ON lightning_transactions;
CREATE TRIGGER school_funding_trigger
  AFTER UPDATE ON lightning_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.type = 'school_funding')
  EXECUTE FUNCTION handle_school_funding();

-- Create function to handle award distribution
CREATE OR REPLACE FUNCTION handle_award_distribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the school_id for the student
  DECLARE
    v_school_id uuid;
  BEGIN
    SELECT school_id INTO v_school_id
    FROM profiles
    WHERE id = NEW.student_id;
    
    -- Only proceed if we found a school_id
    IF v_school_id IS NOT NULL THEN
      -- Deduct from school balance
      UPDATE schools
      SET school_balance = school_balance - NEW.sats
      WHERE id = v_school_id
      AND school_balance >= NEW.sats;
      
      -- Log the award distribution
      INSERT INTO debug_logs (
        event_type,
        user_id,
        details
      ) VALUES (
        'award_distribution',
        NEW.student_id,
        jsonb_build_object(
          'school_id', v_school_id,
          'amount', NEW.sats,
          'reason', NEW.reason,
          'timestamp', now()
        )
      );
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for award distribution
DROP TRIGGER IF EXISTS award_distribution_trigger ON awards;
CREATE TRIGGER award_distribution_trigger
  AFTER INSERT ON awards
  FOR EACH ROW
  EXECUTE FUNCTION handle_award_distribution();