-- First, disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_compliance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_activation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_invitation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_zaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightning_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE legal_agreements DISABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_acceptances DISABLE ROW LEVEL SECURITY;
ALTER TABLE ip_violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_secrets DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I;', policyname, tablename),
            ' '
        )
        FROM pg_policies
        WHERE schemaname = 'public'
    );
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_zaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lightning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Create single policy for all tables to allow authenticated access
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('
            CREATE POLICY "allow_authenticated_access" ON %I
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true)
        ', r.tablename);
    END LOOP;
END $$;