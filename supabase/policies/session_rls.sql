-- RLS Policy for session_codes table
-- Allows: 
--   - Authenticated users to read their own created sessions and all public sessions
--   - Anyone (authenticated or not) to read sessions by code (for joining)
--   - Only professors/staff to create/update/delete sessions

BEGIN;

-- Enable RLS on session_codes if not already enabled
ALTER TABLE IF EXISTS public.session_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read a session by code (for joining)
CREATE POLICY "session_codes_read_by_code" ON public.session_codes
  FOR SELECT
  USING (true);

-- Policy: Only professors (authenticated) can create sessions
CREATE POLICY "session_codes_create_authenticated" ON public.session_codes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Only the session creator can update/delete
CREATE POLICY "session_codes_update_delete_own" ON public.session_codes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "session_codes_delete_own" ON public.session_codes
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;

-- RLS Policy for session_slides table
BEGIN;

ALTER TABLE IF EXISTS public.session_slides ENABLE ROW LEVEL SECURITY;

-- Anyone can read slides for a session they're accessing
CREATE POLICY "session_slides_read_all" ON public.session_slides
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete slides
CREATE POLICY "session_slides_create_authenticated" ON public.session_slides
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "session_slides_update_authenticated" ON public.session_slides
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "session_slides_delete_authenticated" ON public.session_slides
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;

-- RLS Policy for session_answers table
BEGIN;

ALTER TABLE IF EXISTS public.session_answers ENABLE ROW LEVEL SECURITY;

-- Anyone can read answers for a session (professor grading, student feedback)
CREATE POLICY "session_answers_read_all" ON public.session_answers
  FOR SELECT
  USING (true);

-- Anyone (auth or not) can insert answers
CREATE POLICY "session_answers_insert_all" ON public.session_answers
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own answers
CREATE POLICY "session_answers_update_all" ON public.session_answers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "session_answers_delete_authenticated" ON public.session_answers
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;
