
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET is_approved = true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  user_count INT;
  invited_role app_role;
  approved boolean := false;
  final_role app_role := 'user';
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    final_role := 'admin'; approved := true;
  ELSE
    SELECT role INTO invited_role FROM public.pending_invites WHERE email = NEW.email LIMIT 1;
    IF invited_role IS NOT NULL THEN
      final_role := invited_role; approved := true;
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;
  INSERT INTO public.profiles (id, display_name, avatar_url, is_approved)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url', approved);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_access_pin(_pin text)
RETURNS TABLE(ok boolean, mode text, user_id uuid, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  s_mode text; s_global text;
  matched_user uuid; matched_name text; matched_paused boolean; matched_approved boolean;
BEGIN
  SELECT access_mode, global_pin INTO s_mode, s_global FROM public.app_settings WHERE id = 1;
  IF s_mode = 'free' OR s_mode IS NULL THEN
    RETURN QUERY SELECT true, 'free'::text, NULL::uuid, NULL::text; RETURN;
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN
    RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text; RETURN;
  END IF;
  IF s_mode = 'global_pin' THEN
    IF s_global IS NOT NULL AND _pin = s_global THEN
      RETURN QUERY SELECT true, s_mode, NULL::uuid, NULL::text;
    ELSE
      RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
    END IF;
    RETURN;
  END IF;
  IF s_mode = 'user_pin' THEN
    SELECT id, display_name, is_paused, is_approved INTO matched_user, matched_name, matched_paused, matched_approved
    FROM public.profiles WHERE access_pin = _pin LIMIT 1;
    IF matched_user IS NULL OR matched_paused OR NOT matched_approved THEN
      RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
    ELSE
      UPDATE public.profiles SET last_login_at = now() WHERE id = matched_user;
      RETURN QUERY SELECT true, s_mode, matched_user, matched_name;
    END IF;
    RETURN;
  END IF;
  RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
END $function$;

DROP FUNCTION IF EXISTS public.admin_list_user_pins();
CREATE OR REPLACE FUNCTION public.admin_list_user_pins()
RETURNS TABLE(user_id uuid, access_pin text, is_paused boolean, is_approved boolean, last_login_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.id, p.access_pin, p.is_paused, p.is_approved, p.last_login_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin');
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_approved(_user_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET is_approved = _approved WHERE id = _user_id;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_class(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.resources WHERE theme_id IN (SELECT id FROM public.themes WHERE class_id = _id);
  DELETE FROM public.homework  WHERE theme_id IN (SELECT id FROM public.themes WHERE class_id = _id);
  DELETE FROM public.theme_private_notes WHERE theme_id IN (SELECT id FROM public.themes WHERE class_id = _id);
  DELETE FROM public.themes WHERE class_id = _id;
  DELETE FROM public.class_subjects WHERE class_id = _id;
  DELETE FROM public.schedules WHERE class_id = _id;
  DELETE FROM public.classes WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_subject(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.resources WHERE theme_id IN (SELECT id FROM public.themes WHERE subject_id = _id);
  DELETE FROM public.homework  WHERE theme_id IN (SELECT id FROM public.themes WHERE subject_id = _id);
  DELETE FROM public.theme_private_notes WHERE theme_id IN (SELECT id FROM public.themes WHERE subject_id = _id);
  DELETE FROM public.themes WHERE subject_id = _id;
  DELETE FROM public.class_subjects WHERE subject_id = _id;
  DELETE FROM public.schedules WHERE subject_id = _id;
  DELETE FROM public.subjects WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_theme(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.resources WHERE theme_id = _id;
  DELETE FROM public.homework WHERE theme_id = _id;
  DELETE FROM public.theme_private_notes WHERE theme_id = _id;
  UPDATE public.schedules SET theme_id = NULL WHERE theme_id = _id;
  DELETE FROM public.themes WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reset_all()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.test_attempts;
  DELETE FROM public.resources;
  DELETE FROM public.homework;
  DELETE FROM public.theme_private_notes;
  DELETE FROM public.themes;
  DELETE FROM public.schedules;
  DELETE FROM public.class_subjects;
  DELETE FROM public.subjects;
  DELETE FROM public.classes;
END $$;
