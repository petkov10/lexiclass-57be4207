import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export const settingsQuery = queryOptions({
  queryKey: ["app_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return data ?? [];
  },
});

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return data ?? [];
  },
});

export const classSubjectsQuery = queryOptions({
  queryKey: ["class_subjects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("class_subjects").select("*");
    if (error) throw error;
    return data ?? [];
  },
});

export const themesQuery = (classId: string, subjectId: string) =>
  queryOptions({
    queryKey: ["themes", classId, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

export const allThemesQuery = queryOptions({
  queryKey: ["themes-all"],
  queryFn: async () => {
    const { data, error } = await supabase.from("themes").select("*").order("order_index");
    if (error) throw error;
    return data ?? [];
  },
});

export const resourcesForThemeQuery = (themeId: string) =>
  queryOptions({
    queryKey: ["resources", themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("theme_id", themeId)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

export const themeByIdQuery = (themeId: string) =>
  queryOptions({
    queryKey: ["theme", themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("*, class:classes(*), subject:subjects(*)")
        .eq("id", themeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const fileUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
};
