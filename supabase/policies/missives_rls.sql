-- missives_rls.sql
-- Row Level Security (RLS) pour la table `missives`.
-- Policies conçues pour permettre :
--  - lecture des missives globales (recipient empty) ou destinées à l'utilisateur
--  - insertion par tout utilisateur authentifié
--  - modification/suppression uniquement par l'auteur (email)

ALTER TABLE IF EXISTS public.missives ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert missives
CREATE POLICY "Missives insert by authenticated" ON public.missives
  FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

-- Allow select when missive is global (recipient null/empty) OR targeted to user's email OR authored by user
CREATE POLICY "Missives select visible" ON public.missives
  FOR SELECT
  USING (
    (recipient IS NULL) OR (recipient = '') OR
    (lower(coalesce(recipient, '')) = lower(coalesce(current_setting('jwt.claims.email', true), ''))) OR
    (lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')))
  );

-- Allow update only to the original author
CREATE POLICY "Missives update own" ON public.missives
  FOR UPDATE
  USING ( lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')) )
  WITH CHECK ( lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')) );

-- Allow delete only to the original author
CREATE POLICY "Missives delete own" ON public.missives
  FOR DELETE
  USING ( lower(coalesce(author, '')) = lower(coalesce(current_setting('jwt.claims.email', true), '')) );

-- NOTES:
-- 1) These policies rely on the JWT claim `email` provided by Supabase auth.
-- 2) If you prefer to authorize by `sub` (user uuid) use `current_setting('jwt.claims.sub', true)` and store user UUIDs in `author`/`recipient`.
-- 3) Apply these SQL statements in the Supabase SQL editor or via psql.
