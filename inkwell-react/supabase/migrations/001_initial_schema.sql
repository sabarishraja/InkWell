-- ============================================================
-- Inkwell — Database Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

DROP TABLE IF EXISTS nudge_usage;
DROP TABLE IF EXISTS letters;

-- ---- Letters table -------------------------------------------
-- Each letter belongs to one user, has a title, body, and creation
-- timestamp. Once saved a letter is immutable — there is intentionally
-- no UPDATE policy.

CREATE TABLE letters (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for dashboard query: user's letters ordered newest-first
CREATE INDEX letters_user_created ON letters (user_id, created_at DESC);

-- ---- Row Level Security --------------------------------------
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Users may read their own letters
CREATE POLICY "select_own_letters"
  ON letters FOR SELECT
  USING (auth.uid() = user_id);

-- Users may insert their own letters
CREATE POLICY "insert_own_letters"
  ON letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users may delete their own letters
CREATE POLICY "delete_own_letters"
  ON letters FOR DELETE
  USING (auth.uid() = user_id);

-- NO UPDATE POLICY — letters are immutable once saved.
