
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_actor ON public.activity_log (actor_id);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read activity log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors insert their own activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  );

CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _entity_label text DEFAULT NULL,
  _details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT display_name INTO _name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.activity_log (actor_id, actor_name, action, entity_type, entity_id, entity_label, details)
  VALUES (auth.uid(), _name, _action, _entity_type, _entity_id, _entity_label, _details);
END;
$$;
