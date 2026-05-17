/*
  # AI Agent Memory System

  ## Summary
  Adds tables to support the admin AI agent with persistent memory,
  conversation history, and app/site context awareness.

  ## New Tables
  1. `ai_agent_conversations` - Stores full conversation sessions per admin
  2. `ai_agent_messages` - Individual messages within a conversation
  3. `ai_agent_memory` - Long-term key/value memory facts the agent learns over time

  ## Security
  - RLS enabled on all tables
  - Admins can only access their own data
*/

CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own conversations"
  ON ai_agent_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create conversations"
  ON ai_agent_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update own conversations"
  ON ai_agent_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can delete own conversations"
  ON ai_agent_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);


CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view messages in own conversations"
  ON ai_agent_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_agent_conversations
      WHERE id = ai_agent_messages.conversation_id
        AND admin_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert messages in own conversations"
  ON ai_agent_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_agent_conversations
      WHERE id = ai_agent_messages.conversation_id
        AND admin_id = auth.uid()
    )
  );


CREATE TABLE IF NOT EXISTS ai_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  memory_key text NOT NULL,
  memory_value text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_id, memory_key)
);

ALTER TABLE ai_agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own memory"
  ON ai_agent_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can insert memory"
  ON ai_agent_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update own memory"
  ON ai_agent_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can delete own memory"
  ON ai_agent_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE INDEX IF NOT EXISTS ai_agent_messages_conversation_idx ON ai_agent_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ai_agent_memory_admin_idx ON ai_agent_memory(admin_id, category);
