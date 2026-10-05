DROP POLICY IF EXISTS "Public read homework" ON public.homework;
CREATE POLICY "Editors read homework" ON public.homework FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Read visible resource files" ON storage.objects;
CREATE POLICY "Read branding files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');
CREATE POLICY "Editors read resource files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources' AND public.can_edit(auth.uid()));