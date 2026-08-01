// Server-only helper: authenticates callers of the /api/ai* proxy endpoints.
// These endpoints spend AI credits, so they must never be callable anonymously.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ApiAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function requireEditor(request: Request): Promise<ApiAuthResult> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { ok: false, response: new Response("Server misconfigured", { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub as string | undefined;
  if (error || !userId) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }

  const { data: allowed, error: roleError } = await supabase.rpc("can_edit", { _user_id: userId });
  if (roleError || allowed !== true) {
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true, userId };
}
