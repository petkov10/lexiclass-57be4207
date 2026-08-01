CREATE OR REPLACE FUNCTION public.admin_get_global_pin()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT global_pin FROM public.app_settings
  WHERE id = 1 AND public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.admin_get_global_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_global_pin() TO authenticated, service_role;