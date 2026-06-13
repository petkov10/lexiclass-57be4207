
-- 1) app_settings: access mode + global PIN
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'free' CHECK (access_mode IN ('free','global_pin','user_pin')),
  ADD COLUMN IF NOT EXISTS global_pin text;

-- 2) profiles: pause + per-user pin + last_login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_pin text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 3) Lock down PIN visibility: only admins can read access_pin via a dedicated view.
-- Existing SELECT policy on profiles exposes display_name/avatar etc.
-- We add a column-level guard via a SECURITY DEFINER function used by admin UI.
CREATE OR REPLACE FUNCTION public.admin_list_user_pins()
RETURNS TABLE(user_id uuid, access_pin text, is_paused boolean, last_login_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.access_pin, p.is_paused, p.last_login_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.admin_list_user_pins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_pins() TO authenticated, service_role;

-- 4) Admin-only setters
CREATE OR REPLACE FUNCTION public.admin_set_user_pin(_user_id uuid, _pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _pin IS NOT NULL AND _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  UPDATE public.profiles SET access_pin = _pin WHERE id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_pin(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_user_paused(_user_id uuid, _paused boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET is_paused = _paused WHERE id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_paused(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_paused(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_user_display_name(_user_id uuid, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET display_name = _name WHERE id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_display_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_display_name(uuid, text) TO authenticated, service_role;

-- 5) Anonymous-callable PIN verification.
-- Returns matched user_id when user_pin mode matches, or true for global_pin.
-- Never leaks the stored PIN.
CREATE OR REPLACE FUNCTION public.verify_access_pin(_pin text)
RETURNS TABLE(ok boolean, mode text, user_id uuid, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s_mode text;
  s_global text;
  matched_user uuid;
  matched_name text;
  matched_paused boolean;
BEGIN
  SELECT access_mode, global_pin INTO s_mode, s_global FROM public.app_settings WHERE id = 1;

  IF s_mode = 'free' OR s_mode IS NULL THEN
    RETURN QUERY SELECT true, 'free'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN
    RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
    RETURN;
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
    SELECT id, display_name, is_paused INTO matched_user, matched_name, matched_paused
    FROM public.profiles WHERE access_pin = _pin LIMIT 1;
    IF matched_user IS NULL OR matched_paused THEN
      RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
    ELSE
      UPDATE public.profiles SET last_login_at = now() WHERE id = matched_user;
      RETURN QUERY SELECT true, s_mode, matched_user, matched_name;
    END IF;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, s_mode, NULL::uuid, NULL::text;
END $$;
REVOKE ALL ON FUNCTION public.verify_access_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_access_pin(text) TO anon, authenticated, service_role;

-- 6) Admin global PIN / mode setter
CREATE OR REPLACE FUNCTION public.admin_set_access(_mode text, _global_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _mode NOT IN ('free','global_pin','user_pin') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
  IF _global_pin IS NOT NULL AND _global_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  UPDATE public.app_settings SET access_mode = _mode, global_pin = _global_pin WHERE id = 1;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_access(text, text) TO authenticated, service_role;

-- 7) Returns minimal public access config (mode only) for the gate UI
CREATE OR REPLACE FUNCTION public.get_access_mode()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT access_mode FROM public.app_settings WHERE id = 1), 'free')
$$;
REVOKE ALL ON FUNCTION public.get_access_mode() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_access_mode() TO anon, authenticated, service_role;
