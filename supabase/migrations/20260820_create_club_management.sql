-- Tables utilisées par la gestion des clubs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.clubs (
  club_id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  manager_email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  rank text NOT NULL DEFAULT 'Membre de club',
  role text NOT NULL DEFAULT 'Membre de club',
  house text,
  avatar text,
  club_id text REFERENCES public.clubs(club_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  discord_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL REFERENCES public.clubs(club_id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  reason text NOT NULL,
  description text,
  awarded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL REFERENCES public.clubs(club_id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS rank text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS house text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS avatar text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS club_id text REFERENCES public.clubs(club_id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS discord_id text;

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.club_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_members_authenticated_read" ON public.club_members;
CREATE POLICY "club_members_authenticated_read" ON public.club_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "club_members_authenticated_insert" ON public.club_members;
CREATE POLICY "club_members_authenticated_insert" ON public.club_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "club_members_authenticated_update" ON public.club_members;
CREATE POLICY "club_members_authenticated_update" ON public.club_members
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_clubs_created_at ON public.clubs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_points_club_id ON public.club_points (club_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events (date);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members (club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_email ON public.club_members (email);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON public.club_members (user_id);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_authenticated_read" ON public.clubs;
CREATE POLICY "clubs_authenticated_read" ON public.clubs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clubs_authenticated_write" ON public.clubs;
CREATE POLICY "clubs_authenticated_write" ON public.clubs
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "club_points_authenticated_read" ON public.club_points;
CREATE POLICY "club_points_authenticated_read" ON public.club_points
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "club_points_authenticated_write" ON public.club_points;
CREATE POLICY "club_points_authenticated_write" ON public.club_points
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "calendar_events_authenticated_read" ON public.calendar_events;
CREATE POLICY "calendar_events_authenticated_read" ON public.calendar_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "calendar_events_authenticated_write" ON public.calendar_events;
CREATE POLICY "calendar_events_authenticated_write" ON public.calendar_events
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);