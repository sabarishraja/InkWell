-- ============================================================
-- 003_ai_sessions.sql
-- writing_sessions: stores letter coach Q&A + AI intent summary
-- nudge_usage:      rate-limit tracking for AI nudges
-- ============================================================

-- ---- writing_sessions ----------------------------------------

CREATE TABLE IF NOT EXISTS writing_sessions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter_id            UUID        REFERENCES letters(id) ON DELETE SET NULL,  -- nullable, linked after sealing
  qa_pairs             JSONB       NOT NULL DEFAULT '[]',                       -- [{question, answer}, ...]
  intent_summary       TEXT,                                                    -- AI-generated 2-3 sentence reflection
  structure_suggestion TEXT,                                                    -- AI loose structural nudge
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS writing_sessions_user
  ON writing_sessions (user_id, created_at DESC);

ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON writing_sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON writing_sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON writing_sessions;
DROP POLICY IF EXISTS "sessions_delete_own" ON writing_sessions;

CREATE POLICY "sessions_select_own"
  ON writing_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own"
  ON writing_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (needed to link letter_id after sealing)
CREATE POLICY "sessions_update_own"
  ON writing_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own"
  ON writing_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ---- nudge_usage ---------------------------------------------
-- Already referenced in ai-nudge edge function comments;
-- this migration makes it official.

CREATE TABLE IF NOT EXISTS nudge_usage (
  id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Efficient daily count queries: WHERE user_id = ? AND used_at >= today
CREATE INDEX IF NOT EXISTS nudge_usage_user_day
  ON nudge_usage (user_id, used_at);

ALTER TABLE nudge_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nudge_usage_own" ON nudge_usage;

-- Single policy covers all operations
CREATE POLICY "nudge_usage_own"
  ON nudge_usage FOR ALL
  USING (auth.uid() = user_id);
