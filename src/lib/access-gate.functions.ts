// Public access-gate server functions.
// The underlying SECURITY DEFINER routines are no longer callable by anon /
// authenticated roles; they are reached only through the service-role client
// here, so PIN material never leaves the server.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAccessMode = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_access_mode");
  if (error) return { mode: "free" as const };
  return { mode: (data as string) || "free" };
});

export const verifyAccessPin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ pin: z.string().regex(/^\d{4}$/) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("verify_access_pin", { _pin: data.pin });
    if (error) return { ok: false as const };
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.ok) return { ok: false as const };
    return {
      ok: true as const,
      user: row.user_id ? { id: row.user_id as string, name: (row.display_name as string) || "" } : null,
    };
  });
