-- Policies for club_members table
-- Clean RLS policies for `club_members`
-- Safe to run: drops existing policies with the same names first

-- Remove existing policies if present
DROP POLICY IF EXISTS "Club members insert by owner" ON public.club_members;
DROP POLICY IF EXISTS "Club members select own" ON public.club_members;
DROP POLICY IF EXISTS "Club members modify own" ON public.club_members;

-- 1) Allow authenticated users to INSERT a club_members row only for themselves
-- 1) Allow authenticated users to INSERT a club_members row only for themselves
CREATE POLICY "Club members insert by owner (email)" ON public.club_members
FOR INSERT
TO authenticated
WITH CHECK ( lower(coalesce(email, '')) = lower(current_setting('jwt.claims.email', true)) );

-- 2) Allow authenticated users to SELECT only their own row
CREATE POLICY "Club members select own (email)" ON public.club_members
FOR SELECT
TO authenticated
USING ( lower(coalesce(email, '')) = lower(current_setting('jwt.claims.email', true)) );

-- 3a) Allow authenticated users to UPDATE only their own row
CREATE POLICY "Club members modify own (update, email)" ON public.club_members
FOR UPDATE
TO authenticated
USING ( lower(coalesce(email, '')) = lower(current_setting('jwt.claims.email', true)) )
WITH CHECK ( lower(coalesce(email, '')) = lower(current_setting('jwt.claims.email', true)) );

-- 3b) Allow authenticated users to DELETE only their own row
CREATE POLICY "Club members modify own (delete, email)" ON public.club_members
FOR DELETE
TO authenticated
USING ( lower(coalesce(email, '')) = lower(current_setting('jwt.claims.email', true)) );

-- Notes:
-- - These policies assume the `club_members` table has a `user_id` text/uuid column
--   that stores the Supabase Auth user id (auth.uid()).
-- - If you prefer to validate by email, replace the checks by comparing
--   lower(new.email) with lower(current_setting('jwt.claims.email', true)).
-- - Run this SQL in the Supabase SQL editor (Project -> SQL) or via your DB client.
