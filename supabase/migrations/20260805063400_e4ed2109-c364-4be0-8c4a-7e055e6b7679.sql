-- Remove student-facing test surface (tests are print-only now) and revoke public execute
DROP FUNCTION IF EXISTS public.submit_test_attempt(uuid, text, text, text, uuid, jsonb, integer);
DROP FUNCTION IF EXISTS public.get_test_public(uuid);
DROP TABLE IF EXISTS public.test_attempts;

CREATE OR REPLACE FUNCTION public.admin_reset_all()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.resources;
  DELETE FROM public.homework;
  DELETE FROM public.theme_private_notes;
  DELETE FROM public.themes;
  DELETE FROM public.schedules;
  DELETE FROM public.class_subjects;
  DELETE FROM public.subjects;
  DELETE FROM public.classes;
END $function$;
REVOKE ALL ON FUNCTION public.admin_reset_all() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_all() TO authenticated;

-- Access gate: only the two minimal endpoints stay callable before sign-in
REVOKE ALL ON FUNCTION public.get_access_mode() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_access_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_access_mode() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_access_pin(text) TO anon, authenticated;

-- Belt and braces: sensitive columns stay unreadable through the Data API
REVOKE SELECT (global_pin) ON public.app_settings FROM anon, authenticated;
REVOKE SELECT (access_pin) ON public.profiles FROM anon, authenticated;