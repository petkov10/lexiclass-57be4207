
-- 1) Hide global_pin from public/authenticated reads of app_settings
REVOKE SELECT (global_pin) ON public.app_settings FROM anon, authenticated;

-- 2) Hide access_pin from profiles reads by other users
REVOKE SELECT (access_pin) ON public.profiles FROM anon, authenticated;

-- 3) Restrict SECURITY DEFINER admin functions from anon/public
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_set_user_display_name(uuid,text)',
    'admin_set_user_pin(uuid,text)',
    'admin_set_user_paused(uuid,boolean)',
    'admin_set_user_approved(uuid,boolean)',
    'admin_reset_all()',
    'admin_set_access(text,text)',
    'admin_list_user_pins()',
    'admin_delete_class(uuid)',
    'admin_delete_subject(uuid)',
    'admin_delete_theme(uuid)',
    'handle_new_user()',
    'update_updated_at_column()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
  END LOOP;
END $$;
