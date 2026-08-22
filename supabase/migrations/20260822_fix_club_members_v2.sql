-- Fix club_members table: ajouter les colonnes manquantes pour la communauté

-- Vérifier et ajouter club_id si absent
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS club_id TEXT;
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS club_name TEXT;

-- Créer un index sur club_id pour les performances
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
