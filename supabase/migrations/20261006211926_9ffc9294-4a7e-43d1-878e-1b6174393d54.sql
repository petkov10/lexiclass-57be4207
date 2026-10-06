ALTER POLICY "Editors manage classes" ON public.classes TO authenticated;
ALTER POLICY "Editors manage subjects" ON public.subjects TO authenticated;
ALTER POLICY "Editors manage class_subjects" ON public.class_subjects TO authenticated;
ALTER POLICY "Editors manage themes" ON public.themes TO authenticated;
ALTER POLICY "Editors manage resources" ON public.resources TO authenticated;
ALTER POLICY "Admins manage invites" ON public.pending_invites TO authenticated;
ALTER POLICY "Editors manage homework" ON public.homework TO authenticated;