
-- 1. Editor-only private notes table
CREATE TABLE IF NOT EXISTS public.theme_private_notes (
  theme_id uuid PRIMARY KEY REFERENCES public.themes(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_private_notes TO authenticated;
GRANT ALL ON public.theme_private_notes TO service_role;

ALTER TABLE public.theme_private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors manage theme private notes"
  ON public.theme_private_notes FOR ALL TO authenticated
  USING (public.can_edit(auth.uid()))
  WITH CHECK (public.can_edit(auth.uid()));

CREATE TRIGGER theme_private_notes_updated_at
  BEFORE UPDATE ON public.theme_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing data and drop public column
INSERT INTO public.theme_private_notes (theme_id, notes)
SELECT id, private_notes FROM public.themes
WHERE private_notes IS NOT NULL AND length(trim(private_notes)) > 0
ON CONFLICT (theme_id) DO NOTHING;

ALTER TABLE public.themes DROP COLUMN IF EXISTS private_notes;

-- 3. Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO authenticated, service_role;

-- 4. Add basic validation to anonymous test submissions
DROP POLICY IF EXISTS "Anyone can submit test attempt" ON public.test_attempts;
CREATE POLICY "Anyone can submit test attempt"
  ON public.test_attempts FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(student_name)) BETWEEN 1 AND 100
    AND (student_number IS NULL OR length(student_number) <= 50)
    AND (student_class IS NULL OR length(student_class) <= 100)
    AND jsonb_typeof(answers) = 'array'
  );
