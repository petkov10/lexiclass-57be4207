import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "editor" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        const roles = (data ?? []).map((r) => r.role as AppRole);
        if (roles.includes("admin")) setRole("admin");
        else if (roles.includes("editor")) setRole("editor");
        else setRole("user");
        setLoading(false);
      });
  }, [userId]);
  return { role, loading, isAdmin: role === "admin", canEdit: role === "admin" || role === "editor" };
}

export function useIsAdmin(userId: string | undefined) {
  const { isAdmin, loading } = useRole(userId);
  return { isAdmin, loading };
}
