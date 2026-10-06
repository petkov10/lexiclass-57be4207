GRANT SELECT ON public.classes, public.subjects, public.themes, public.resources, public.class_subjects TO anon;
GRANT SELECT (id, site_name, logo_text, logo_url, color_scheme, theme_mode, extra, updated_at, grading_scale, access_mode) ON public.app_settings TO anon;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO anon, authenticated;