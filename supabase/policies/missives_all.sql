-- missives_all.sql
-- Création de la table `missives` + RLS policies

-- Table
CREATE TABLE IF NOT EXISTS public.missives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  message text NOT NULL,
  author text,
  recipient text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missives_created_at ON public.missives(created_at DESC);

-- Row Level Security
ALTER TABLE IF EXISTS public.missives ENABLE ROW LEVEL SECURITY;

-- Remove any stray storage trigger that may have been attached accidentally.
-- Some Supabase projects incorrectly attach the storage.protect_delete trigger
-- to non-storage tables; this causes inserts/updates to fail with the
-- "Direct deletion from storage tables is not allowed" error. Ensure the
-- trigger is removed from `missives` to allow normal operations.
DROP TRIGGER IF EXISTS missives ON public.missives;

-- Ensure policies can be (re)applied safely
DROP POLICY IF EXISTS "Missives insert by authenticated" ON public.missives;
-- Allow authenticated users to insert missives
CREATE POLICY "Missives insert by authenticated" ON public.missives
  FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Missives select visible" ON public.missives;
-- Allow select when missive is global (recipient null/empty) OR targeted to user's email OR authored by user
CREATE POLICY "Missives select visible" ON public.missives
  FOR SELECT
  USING (
    (recipient IS NULL) OR (recipient = '') OR
    (lower(coalesce(recipient, '')) = lower(coalesce(current_setting('jwt.claims.email', true), ''))) OR
    (lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')))
  );

DROP POLICY IF EXISTS "Missives update own" ON public.missives;
-- Allow update only to the original author
CREATE POLICY "Missives update own" ON public.missives
  FOR UPDATE
  USING ( lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')) )
  WITH CHECK ( lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')) );

DROP POLICY IF EXISTS "Missives delete own" ON public.missives;
-- Allow delete only to the original author
CREATE POLICY "Missives delete own" ON public.missives
  FOR DELETE
  USING (
    lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), ''))
    OR lower(coalesce(recipient, '')) = lower(coalesce(current_setting('jwt.claims.email', true), ''))
  );

-- NOTES:
-- If your DB doesn't have pgcrypto, replace gen_random_uuid() with uuid_generate_v4()
-- To apply: copy this whole file into Supabase SQL editor and run, or run with psql from your terminal.