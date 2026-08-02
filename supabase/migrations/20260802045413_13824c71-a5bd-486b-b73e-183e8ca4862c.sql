ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Public read resources" ON public.resources;
CREATE POLICY "Public read resources" ON public.resources
FOR SELECT TO anon, authenticated
USING (is_hidden = false OR public.can_edit(auth.uid()));