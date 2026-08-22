-- Identifiant Discord du professeur destinataire des notifications de hiboux.
ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS discord_id text;

CREATE INDEX IF NOT EXISTS idx_professors_discord_id
  ON public.professors (discord_id)
  WHERE discord_id IS NOT NULL;