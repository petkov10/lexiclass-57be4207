-- 1) Нов тип ресурс: учебник
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'textbook';

-- 2) Кошче (soft delete)
ALTER TABLE public.classes   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.subjects  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.themes    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS "Public read classes" ON public.classes;
CREATE POLICY "Public read classes" ON public.classes FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Public read themes" ON public.themes;
CREATE POLICY "Public read themes" ON public.themes FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Public read resources" ON public.resources;
CREATE POLICY "Public read resources" ON public.resources FOR SELECT TO anon, authenticated
  USING ((is_hidden = false AND deleted_at IS NULL) OR public.can_edit(auth.uid()));

-- 3) Данни за вход към портали на издателства (само редактори/админи)
CREATE TABLE IF NOT EXISTS public.textbook_credentials (
  resource_id uuid PRIMARY KEY REFERENCES public.resources(id) ON DELETE CASCADE,
  portal_url text,
  username text,
  password text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.textbook_credentials TO authenticated;
GRANT ALL ON public.textbook_credentials TO service_role;
ALTER TABLE public.textbook_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors manage textbook credentials" ON public.textbook_credentials
  FOR ALL TO authenticated
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE TRIGGER textbook_credentials_updated_at BEFORE UPDATE ON public.textbook_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Настройки за AI доставчик (ключът е недостъпен през Data API)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'lovable',
  model text,
  api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TRIGGER ai_settings_updated_at BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_get_ai_settings()
RETURNS TABLE(provider text, model text, has_key boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.provider, s.model, (s.api_key IS NOT NULL AND s.api_key <> '')
  FROM public.ai_settings s
  WHERE s.id = 1 AND public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.admin_set_ai_settings(_provider text, _model text, _api_key text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _provider NOT IN ('lovable','gemini','openai') THEN RAISE EXCEPTION 'Invalid provider'; END IF;
  UPDATE public.ai_settings
     SET provider = _provider,
         model = NULLIF(_model, ''),
         api_key = CASE WHEN _api_key IS NULL THEN api_key
                        WHEN _api_key = '' THEN NULL
                        ELSE _api_key END
   WHERE id = 1;
END $$;

REVOKE ALL ON FUNCTION public.admin_get_ai_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_ai_settings(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_settings(text, text, text) TO authenticated;