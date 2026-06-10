
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'test';
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'lesson_plan';
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'code_exercise';
ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS private_notes text;
