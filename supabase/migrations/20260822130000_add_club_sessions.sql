-- Associate club sessions with the club that created them.
ALTER TABLE IF EXISTS session_codes ADD COLUMN IF NOT EXISTS club_id TEXT;
CREATE INDEX IF NOT EXISTS idx_session_codes_club_id ON session_codes(club_id);