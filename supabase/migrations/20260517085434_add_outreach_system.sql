/*
  # Outreach System

  Adds prospect outreach and email campaign tracking for the AI agent to manage
  school trust outreach, track correspondence, and learn from responses.

  ## New Tables

  ### outreach_prospects
  - Schools/trusts the AI agent is targeting for SatsRewards adoption
  - Tracks contact details, decision-maker info, engagement stage, and AI notes

  ### outreach_emails
  - Every email sent (or drafted) to a prospect, with full body, subject, metadata
  - Tracks open/reply status and links back to conversation_id so the AI can recall context

  ### outreach_responses
  - Inbound replies and notes from prospects
  - AI reads these to update its strategy and learn objections/interests

  ### outreach_campaigns
  - Named campaign waves (e.g. "London Trust Q3 2026")
  - Groups prospects and sets targeting parameters

  ## Security
  - All tables have RLS enabled
  - Admins can only manage prospects/emails linked to their own user account
*/

-- ─── Prospects ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid,                          -- populated once campaigns table exists

  -- Organisation
  organisation_name text NOT NULL,
  organisation_type text NOT NULL DEFAULT 'school',  -- 'school' | 'trust' | 'academy_trust' | 'local_authority'
  website text DEFAULT '',
  address text DEFAULT '',
  region text DEFAULT '',
  pupil_count integer DEFAULT 0,
  school_count integer DEFAULT 1,            -- number of schools in trust

  -- Decision maker
  contact_name text DEFAULT '',
  contact_title text DEFAULT '',             -- 'Headteacher' | 'CEO' | 'COO' | 'Finance Director' etc.
  contact_email text NOT NULL,
  contact_phone text DEFAULT '',

  -- Pipeline stage
  stage text NOT NULL DEFAULT 'identified',
  -- 'identified' → 'researched' → 'emailed' → 'replied' → 'meeting_booked' → 'demo_given' → 'converted' | 'declined' | 'dormant'

  -- AI-generated research
  research_notes text DEFAULT '',            -- AI's notes about this org
  pain_points text[] DEFAULT '{}',           -- e.g. ['high ed-tech costs', 'low student engagement']
  personalisation_hooks text[] DEFAULT '{}', -- specific angles to use in outreach
  competitor_platforms text[] DEFAULT '{}',  -- other platforms they might use

  -- Tracking
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  reply_sentiment text DEFAULT '',           -- 'positive' | 'negative' | 'neutral' | 'interested'
  do_not_contact boolean NOT NULL DEFAULT false,

  -- Metadata
  tags text[] DEFAULT '{}',
  ai_score integer DEFAULT 0,               -- 0-100 AI-assessed likelihood to convert
  notes text DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own prospects"
  ON outreach_prospects FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can insert own prospects"
  ON outreach_prospects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update own prospects"
  ON outreach_prospects FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can delete own prospects"
  ON outreach_prospects FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS outreach_prospects_created_by_idx ON outreach_prospects(created_by, stage);
CREATE INDEX IF NOT EXISTS outreach_prospects_email_idx ON outreach_prospects(contact_email);

-- ─── Outreach Emails ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,                      -- links to ai_agent_conversations

  subject text NOT NULL,
  body text NOT NULL,
  email_type text NOT NULL DEFAULT 'initial',  -- 'initial' | 'follow_up_1' | 'follow_up_2' | 'breakup' | 'custom'
  status text NOT NULL DEFAULT 'draft',        -- 'draft' | 'sent' | 'bounced' | 'opened' | 'replied'

  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,

  -- AI metadata
  ai_generated boolean NOT NULL DEFAULT true,
  personalisation_used text[] DEFAULT '{}',
  tone text DEFAULT 'professional',            -- 'professional' | 'warm' | 'bold' | 'concise'

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own outreach emails"
  ON outreach_emails FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can insert own outreach emails"
  ON outreach_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update own outreach emails"
  ON outreach_emails FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS outreach_emails_prospect_idx ON outreach_emails(prospect_id, created_at);

-- ─── Outreach Responses ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES outreach_emails(id) ON DELETE SET NULL,
  prospect_id uuid NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  response_type text NOT NULL DEFAULT 'email_reply',  -- 'email_reply' | 'phone_call' | 'manual_note' | 'auto_reply'
  content text NOT NULL,
  sentiment text DEFAULT 'neutral',           -- 'positive' | 'negative' | 'neutral' | 'interested' | 'objection'

  -- AI-extracted insights
  key_objections text[] DEFAULT '{}',
  expressed_interests text[] DEFAULT '{}',
  requested_info text[] DEFAULT '{}',
  follow_up_required boolean NOT NULL DEFAULT false,
  ai_summary text DEFAULT '',

  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own responses"
  ON outreach_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can insert own responses"
  ON outreach_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update own responses"
  ON outreach_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS outreach_responses_prospect_idx ON outreach_responses(prospect_id, received_at);

-- ─── Campaigns ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text DEFAULT '',
  target_region text DEFAULT '',
  target_org_types text[] DEFAULT '{"school","trust","academy_trust"}',
  target_pupil_min integer DEFAULT 0,
  target_pupil_max integer DEFAULT 10000,

  status text NOT NULL DEFAULT 'active',     -- 'active' | 'paused' | 'completed' | 'archived'

  -- Goals
  target_prospect_count integer DEFAULT 50,
  target_reply_rate numeric(5,2) DEFAULT 10.0,
  target_conversion_count integer DEFAULT 3,

  -- Performance (updated by AI)
  total_prospects integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  emails_opened integer NOT NULL DEFAULT 0,
  replies_received integer NOT NULL DEFAULT 0,
  meetings_booked integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,

  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own campaigns"
  ON outreach_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can insert own campaigns"
  ON outreach_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update own campaigns"
  ON outreach_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ─── Add campaign FK to prospects ────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'outreach_prospects' AND constraint_name = 'outreach_prospects_campaign_id_fkey'
  ) THEN
    ALTER TABLE outreach_prospects
      ADD CONSTRAINT outreach_prospects_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;
