-- Créneaux de réservation pédagogique de 30 minutes maximum.
CREATE TABLE IF NOT EXISTS public.lesson_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  school_year text NOT NULL,
  teacher_email text NOT NULL,
  teacher_name text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_slots_valid_range CHECK (
    end_time <> start_time
    AND CASE
      WHEN end_time > start_time THEN end_time - start_time
      ELSE (end_time + interval '24 hours') - start_time
    END <= interval '30 minutes'
  )
);

ALTER TABLE public.lesson_slots
  DROP CONSTRAINT IF EXISTS lesson_slots_valid_range;

ALTER TABLE public.lesson_slots
  ADD CONSTRAINT lesson_slots_valid_range CHECK (
    end_time <> start_time
    AND CASE
      WHEN end_time > start_time THEN end_time - start_time
      ELSE (end_time + interval '24 hours') - start_time
    END <= interval '30 minutes'
  );

ALTER TABLE public.lesson_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_slots_authenticated_read" ON public.lesson_slots;
CREATE POLICY "lesson_slots_authenticated_read" ON public.lesson_slots
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lesson_slots_authenticated_insert" ON public.lesson_slots;
CREATE POLICY "lesson_slots_authenticated_insert" ON public.lesson_slots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lesson_slots_authenticated_update" ON public.lesson_slots;
CREATE POLICY "lesson_slots_authenticated_update" ON public.lesson_slots
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lesson_slots_authenticated_delete" ON public.lesson_slots;
CREATE POLICY "lesson_slots_authenticated_delete" ON public.lesson_slots
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lesson_slots_date_start
  ON public.lesson_slots (date, start_time);
CREATE INDEX IF NOT EXISTS idx_lesson_slots_teacher_date
  ON public.lesson_slots (teacher_email, date);
