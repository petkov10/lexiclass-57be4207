
CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor')) $$;

REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage classes" ON public.classes;
CREATE POLICY "Editors manage classes" ON public.classes FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Editors manage subjects" ON public.subjects FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins manage class_subjects" ON public.class_subjects;
CREATE POLICY "Editors manage class_subjects" ON public.class_subjects FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins manage themes" ON public.themes;
CREATE POLICY "Editors manage themes" ON public.themes FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
CREATE POLICY "Editors manage resources" ON public.resources FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TABLE IF NOT EXISTS public.pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'editor',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO authenticated;
GRANT ALL ON public.pending_invites TO service_role;
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.pending_invites FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own schedule" ON public.schedules FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline date,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homework TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read homework" ON public.homework FOR SELECT USING (true);
CREATE POLICY "Editors manage homework" ON public.homework FOR ALL
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE TRIGGER homework_updated_at BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
  invited_role app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url');

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    SELECT role INTO invited_role FROM public.pending_invites WHERE email = NEW.email LIMIT 1;
    IF invited_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invited_role);
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
