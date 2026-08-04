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

/** Чете файл като base64 (без data: префикс) за изпращане към AI. */
export async function fileToAiPayload(file: File): Promise<{ name: string; mime: string; data: string }> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { name: file.name, mime: file.type || "application/octet-stream", data: btoa(binary) };
}
