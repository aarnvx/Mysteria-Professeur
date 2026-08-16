-- create_missives_table.sql
-- Crée la table `missives` pour le système de hiboux

CREATE TABLE IF NOT EXISTS public.missives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  message text NOT NULL,
  author text,
  recipient text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index utile pour requêtes récentes
CREATE INDEX IF NOT EXISTS idx_missives_created_at ON public.missives(created_at DESC);

-- Note: si votre instance Postgres n'a pas l'extension pgcrypto, remplacez gen_random_uuid()
-- par uuid_generate_v4() après avoir activé l'extension uuid-ossp.
