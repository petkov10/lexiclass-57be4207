import { useEffect, useState } from "react";
import { getAccessMode } from "@/lib/access-gate.functions";

const TOKEN_KEY = "lexiclass:access_ok";
const USER_KEY = "lexiclass:access_user";

export function isGatePassed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TOKEN_KEY) === "1";
}

export function getGateUser(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function markGatePassed(user?: { id: string; name: string } | null) {
  sessionStorage.setItem(TOKEN_KEY, "1");
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearGate() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function useAccessMode() {
  const [mode, setMode] = useState<"free" | "global_pin" | "user_pin" | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_access_mode").then(({ data }) => {
      if (cancelled) return;
      const m = (data as string) || "free";
      setMode(m as any);
    });
    return () => { cancelled = true; };
  }, []);
  return mode;
}
