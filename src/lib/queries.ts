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
    const { data, error } = await supabase.from("classes").select("*").order("order_index");
    if (error) throw error;
    return data ?? [];
  },
});

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("subjects").select("*").order("order_index");
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

export const homeworkForThemeQuery = (themeId: string) =>
  queryOptions({
    queryKey: ["homework", themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("theme_id", themeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const mySchedulesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["schedules", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, class:classes(id,name), subject:subjects(id,name), theme:themes(id,name)")
        .eq("owner_id", userId!)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

export const usersWithRolesQuery = queryOptions({
  queryKey: ["users-roles"],
  queryFn: async () => {
    const [{ data: profiles }, { data: roles }, { data: invites }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("pending_invites").select("*").order("created_at", { ascending: false }),
    ]);
    return { profiles: profiles ?? [], roles: roles ?? [], invites: invites ?? [] };
  },
});

// Signed URL for a file in the private "resources" bucket.
// Cached by react-query (1h TTL matching the signed URL lifetime).
export const signedFileUrlQuery = (path: string | null | undefined) =>
  queryOptions({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("resources")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

// Signed URL for a file in the private "branding" bucket (logos).
export const signedBrandingUrlQuery = (path: string | null | undefined) =>
  queryOptions({
    queryKey: ["signed-branding-url", path],
    enabled: !!path,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("branding")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

/**
 * @deprecated Bucket „resources" е частен. Използвайте useResourceUrl / signedFileUrlQuery.
 * Оставено само за обратна съвместимост — не гарантира достъп.
 */
export const fileUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
};
