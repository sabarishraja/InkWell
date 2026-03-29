-- ---- Seal design preferences ------------------------------------------
-- Stores the wax seal design and color chosen by the writer at sealing
-- time. Used to render the correct seal on the recipient's reading page.

ALTER TABLE letters
  ADD COLUMN IF NOT EXISTS seal_design TEXT NOT NULL DEFAULT 'heart',
  ADD COLUMN IF NOT EXISTS seal_color  TEXT NOT NULL DEFAULT 'classic-red';
