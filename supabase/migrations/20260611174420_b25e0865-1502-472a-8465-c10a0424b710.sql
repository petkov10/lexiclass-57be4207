
-- Test attempts table for student test runs
CREATE TABLE public.test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_number TEXT,
  student_class TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade NUMERIC(3,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_attempts_resource ON public.test_attempts(resource_id);
CREATE INDEX idx_test_attempts_theme ON public.test_attempts(theme_id);
CREATE INDEX idx_test_attempts_submitted ON public.test_attempts(submitted_at DESC);

GRANT SELECT, INSERT ON public.test_attempts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous students) can submit an attempt
CREATE POLICY "Anyone can submit test attempt" ON public.test_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only admins/editors can view, update or delete attempts
CREATE POLICY "Editors can read attempts" ON public.test_attempts
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));

CREATE POLICY "Editors can update attempts" ON public.test_attempts
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()));

CREATE POLICY "Editors can delete attempts" ON public.test_attempts
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- Add grading_scale to app_settings (jsonb array of {min_percent, grade})
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS grading_scale JSONB NOT NULL DEFAULT
    '[{"min_percent":90,"grade":6.00},{"min_percent":75,"grade":5.00},{"min_percent":60,"grade":4.00},{"min_percent":45,"grade":3.00},{"min_percent":0,"grade":2.00}]'::jsonb;
