-- 1. Hide global_pin from public reads
REVOKE SELECT ON public.app_settings FROM anon, authenticated;
GRANT SELECT (id, site_name, logo_text, logo_url, color_scheme, theme_mode, extra, updated_at, grading_scale, access_mode) ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;

-- 2. Hide access_pin from all reads (admins use admin_list_user_pins)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, created_at, is_paused, is_approved, last_login_at) ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 3. Revoke anon/public EXECUTE on SECURITY DEFINER helpers not meant to be public
REVOKE ALL ON FUNCTION public.log_activity(text, text, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, text, jsonb) TO authenticated, service_role;

-- 4. Private storage for test answer keys
CREATE TABLE IF NOT EXISTS public.test_content (
  resource_id uuid PRIMARY KEY REFERENCES public.resources(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_content TO authenticated;
GRANT ALL ON public.test_content TO service_role;
ALTER TABLE public.test_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editors manage test content" ON public.test_content;
CREATE POLICY "Editors manage test content" ON public.test_content
  FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- migrate existing test answer keys out of the publicly readable resources table
INSERT INTO public.test_content (resource_id, content)
SELECT id, content FROM public.resources WHERE type = 'test' AND content IS NOT NULL
ON CONFLICT (resource_id) DO NOTHING;
UPDATE public.resources SET content = NULL WHERE type = 'test';

-- 5. Student-safe test payload (no answer/explanation)
CREATE OR REPLACE FUNCTION public.get_test_public(_resource_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'title', COALESCE(tc.content->>'title', r.title),
    'description', r.description,
    'time_limit', tc.content->'time_limit',
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'q', q->>'q',
        'type', COALESCE(q->>'type','open'),
        'options', COALESCE(q->'options', '[]'::jsonb)
      ) ORDER BY ord)
      FROM jsonb_array_elements(COALESCE(tc.content->'questions','[]'::jsonb)) WITH ORDINALITY AS t(q, ord)
    ), '[]'::jsonb)
  )
  FROM public.resources r
  LEFT JOIN public.test_content tc ON tc.resource_id = r.id
  WHERE r.id = _resource_id AND r.type = 'test';
$$;
REVOKE ALL ON FUNCTION public.get_test_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_test_public(uuid) TO anon, authenticated, service_role;

-- 6. Server-side grading + attempt persistence
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  _resource_id uuid,
  _student_name text,
  _student_number text,
  _student_class text,
  _class_id uuid,
  _given jsonb,
  _duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  key jsonb; qs jsonb; q jsonb; i int := 0;
  given_text text; is_correct boolean;
  score int := 0; maxs int := 0;
  details jsonb := '[]'::jsonb;
  pct numeric := 0; g numeric; scale jsonb; item jsonb;
  theme uuid;
BEGIN
  IF _student_name IS NULL OR length(btrim(_student_name)) < 1 OR length(btrim(_student_name)) > 100 THEN
    RAISE EXCEPTION 'Invalid student name';
  END IF;
  IF _student_number IS NOT NULL AND length(_student_number) > 50 THEN RAISE EXCEPTION 'Invalid number'; END IF;
  IF _student_class IS NOT NULL AND length(_student_class) > 100 THEN RAISE EXCEPTION 'Invalid class'; END IF;
  IF jsonb_typeof(COALESCE(_given, 'null'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Invalid answers'; END IF;

  SELECT tc.content, r.theme_id INTO key, theme
  FROM public.resources r LEFT JOIN public.test_content tc ON tc.resource_id = r.id
  WHERE r.id = _resource_id AND r.type = 'test';
  IF key IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;

  qs := COALESCE(key->'questions', '[]'::jsonb);
  FOR q IN SELECT * FROM jsonb_array_elements(qs) LOOP
    given_text := COALESCE(_given->>i, '');
    is_correct := btrim(lower(given_text)) = btrim(lower(COALESCE(q->>'answer','')));
    maxs := maxs + 1;
    IF is_correct THEN score := score + 1; END IF;
    details := details || jsonb_build_object(
      'q', q->>'q', 'type', q->>'type', 'given', given_text,
      'expected', q->>'answer', 'correct', is_correct, 'explanation', q->>'explanation'
    );
    i := i + 1;
  END LOOP;

  IF maxs > 0 THEN pct := round((score::numeric / maxs) * 100, 2); END IF;

  SELECT grading_scale INTO scale FROM public.app_settings WHERE id = 1;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(scale, '[]'::jsonb)) LOOP
    IF pct >= (item->>'min_percent')::numeric AND (g IS NULL OR (item->>'grade')::numeric > g) THEN
      g := (item->>'grade')::numeric;
    END IF;
  END LOOP;

  INSERT INTO public.test_attempts (resource_id, theme_id, student_name, student_number, student_class,
    class_id, answers, score, max_score, percent, grade, duration_seconds)
  VALUES (_resource_id, theme, btrim(_student_name), _student_number, _student_class,
    _class_id, details, score, maxs, pct, g, GREATEST(COALESCE(_duration_seconds,0), 0));

  RETURN jsonb_build_object('score', score, 'max_score', maxs, 'percent', pct, 'grade', g, 'details', details);
END $$;
REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, text, text, text, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, text, text, text, uuid, jsonb, integer) TO anon, authenticated, service_role;