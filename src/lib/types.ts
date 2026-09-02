export type ClassRow = {
  id: string;
  name: string;
  order_index: number;
  created_at: string;
};

export type SubjectRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  order_index: number;
};

export type ClassSubject = {
  id: string;
  class_id: string;
  subject_id: string;
};

export type ThemeRow = {
  id: string;
  class_id: string;
  subject_id: string;
  name: string;
  description: string | null;
  week_number: number | null;
  order_index: number;
};

export type ResourceType =
  | "presentation"
  | "document"
  | "link"
  | "video"
  | "test"
  | "task"
  | "code"
  | "image"
  | "note"
  | "notebooklm"
  | "flashcards"
  | "lesson_plan"
  | "code_exercise"
  | "textbook"
  | "other";

export type Flashcard = { front: string; back: string };

export type ResourceRow = {
  id: string;
  theme_id: string;
  type: ResourceType;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  content: Record<string, unknown> | null;
  order_index: number;
  is_hidden?: boolean;
  created_at: string;
};

export type AppSettings = {
  id: number;
  site_name: string;
  logo_text: string | null;
  logo_url: string | null;
  color_scheme: string;
  theme_mode: "light" | "dark";
  extra: Record<string, unknown>;
};
