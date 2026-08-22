-- Student accounts are created before their RP profile is completed.
ALTER TABLE IF EXISTS club_members
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;