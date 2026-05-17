/*
  # Add Outreach Scheduler Log Table

  1. New Tables
    - `outreach_scheduler_log`
      - `id` (uuid, primary key)
      - `run_at` (timestamptz) - when the scheduler ran
      - `emails_sent_this_week` (int) - count already sent before this run
      - `emails_requested` (int) - how many new emails were requested
      - `region_targeted` (text) - UK region targeted this week
      - `status` (text) - completed / target_met / agent_error
      - `agent_reply` (text) - summary from the AI agent
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admins can read their own logs
*/

CREATE TABLE IF NOT EXISTS outreach_scheduler_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  emails_sent_this_week integer DEFAULT 0,
  emails_requested integer DEFAULT 0,
  region_targeted text DEFAULT '',
  status text DEFAULT 'completed',
  agent_reply text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outreach_scheduler_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read scheduler logs"
  ON outreach_scheduler_log FOR SELECT
  TO authenticated
  USING (true);
