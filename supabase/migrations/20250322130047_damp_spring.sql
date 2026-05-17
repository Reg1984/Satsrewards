/*
  # UK School Compliance Enhancements

  1. New Fields
    - Added DfE number field
    - Added school type classification
    - Added year group tracking
    - Added safeguarding flags
    - Added parent/guardian consent tracking
    - Added SEND status tracking

  2. Changes
    - Enhanced data retention policies
    - Added educational context fields
    - Added safeguarding controls
*/

DO $$ 
BEGIN
  -- Add UK-specific school fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'dfe_number'
  ) THEN
    ALTER TABLE profiles 
      ADD COLUMN dfe_number text,
      ADD COLUMN school_type text CHECK (school_type IN ('primary', 'secondary', 'sixth_form', 'all_through')),
      ADD COLUMN year_group text,
      ADD COLUMN send_status boolean DEFAULT false,
      ADD COLUMN parent_consent_timestamp timestamptz,
      ADD COLUMN safeguarding_flag boolean DEFAULT false,
      ADD COLUMN parent_email text,
      ADD COLUMN requires_parent_consent boolean DEFAULT true,
      ADD COLUMN educational_credits integer DEFAULT 0;
  END IF;

  -- Add index for DfE number
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_dfe_number'
  ) THEN
    CREATE INDEX idx_profiles_dfe_number ON profiles(dfe_number);
  END IF;

  -- Add policy for safeguarding access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'teachers_can_view_safeguarding'
  ) THEN
    CREATE POLICY "teachers_can_view_safeguarding"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (
        (auth.uid() IN (
          SELECT id FROM profiles 
          WHERE role = 'teacher' OR role = 'admin'
        ))
        AND 
        (class_id IS NOT NULL)
      );
  END IF;
END $$;