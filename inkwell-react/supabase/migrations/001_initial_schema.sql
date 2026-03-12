-- ============================================================
-- Inkwell — Initial Database Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ---- Letters table ------------------------------------------
CREATE TABLE letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL DEFAULT '',
  deliver_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Extended metadata
  recipient_name  TEXT DEFAULT '',
  paper_style     TEXT DEFAULT 'parchment' CHECK (paper_style IN ('parchment', 'linen', 'aged')),
  ink_color       TEXT DEFAULT 'sepia'     CHECK (ink_color    IN ('sepia', 'navy', 'midnight')),
  delivery_type   TEXT DEFAULT 'now'       CHECK (delivery_type IN ('now', 'scheduled', 'surprise')),
  status          TEXT DEFAULT 'sealed'    CHECK (status        IN ('sealed', 'delivered', 'opened'))
);

-- Index for vault queries (user's letters sorted by delivery date)
CREATE INDEX letters_user_deliver ON letters (user_id, deliver_at);

-- Row Level Security — users can only access their own letters
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their letters"
ON letters FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ---- Nudge usage table (rate limiting for AI nudge) ----------
CREATE TABLE nudge_usage (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX nudge_usage_user_day ON nudge_usage (user_id, used_at);

ALTER TABLE nudge_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their nudge usage"
ON nudge_usage FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ---- Scheduled delivery function (optional) ------------------
-- TODO: Replace with Supabase cron + Resend API for real email delivery.
-- This function marks letters as delivered when their deliver_at time passes.
-- Wire to pg_cron: SELECT cron.schedule('deliver-letters', '*/15 * * * *', $$...$$);
