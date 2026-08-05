-- 1. Restrict profile visibility
DROP POLICY IF EXISTS "Profiles readable by all authenticated" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.can_edit(auth.uid()));

-- 2. Storage: hidden resources must not be readable
DROP POLICY IF EXISTS "Public read resources bucket" ON storage.objects;
CREATE POLICY "Read visible resource files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'branding'
    OR (
      bucket_id = 'resources'
      AND (
        public.can_edit(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.resources r
          WHERE r.file_path = storage.objects.name AND r.is_hidden = false
        )
      )
    )
  );

-- 3. SECURITY DEFINER functions must not be callable from the browser
REVOKE EXECUTE ON FUNCTION public.get_access_mode() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_access_pin(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_access_mode() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_access_pin(text) TO service_role;