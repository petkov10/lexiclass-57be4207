import { supabase } from "@/integrations/supabase/client";

/**
 * Calls one of the /api/ai* endpoints with the current user's bearer token.
 * These endpoints require an editor/admin session on the server.
 */
export async function aiFetch(path: string, body: unknown): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Необходимо е вписване, за да използвате AI функциите.");
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}
