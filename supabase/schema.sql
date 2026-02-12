-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Letters table
CREATE TABLE IF NOT EXISTS letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  max_views INTEGER DEFAULT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_letters_slug ON letters (slug);
CREATE INDEX IF NOT EXISTS idx_letters_expires_at ON letters (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters (created_at);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted, non-expired letters.
DROP POLICY IF EXISTS "Public read access" ON letters;
CREATE POLICY "Public read access" ON letters
  FOR SELECT
  USING (
    is_deleted = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Anyone can insert (for creating letters).
DROP POLICY IF EXISTS "Public insert access" ON letters;
CREATE POLICY "Public insert access" ON letters
  FOR INSERT
  WITH CHECK (TRUE);

-- View count function
CREATE OR REPLACE FUNCTION increment_view_count(letter_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE letters
  SET view_count = view_count + 1
  WHERE id = letter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
