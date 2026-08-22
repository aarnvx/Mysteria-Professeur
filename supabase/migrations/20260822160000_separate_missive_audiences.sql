-- Keep professor and club broadcasts isolated in the shared missives table.
ALTER TABLE IF EXISTS missives
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'prof';

CREATE INDEX IF NOT EXISTS idx_missives_audience ON missives(audience);