
ALTER TABLE public.themes
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS themes_tags_idx ON public.themes USING gin (tags);
