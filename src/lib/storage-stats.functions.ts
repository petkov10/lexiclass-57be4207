import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aggregate storage usage across the "resources" and "branding" buckets.
 * Uses the admin client because the storage list API needs it to enumerate
 * all files regardless of ownership. Only admins/editors can call it.
 */
export const getStorageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Require at least an editor role
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "editor");
    if (!allowed) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function sumBucket(bucket: string): Promise<{ bucket: string; bytes: number; files: number }> {
      let total = 0;
      let count = 0;
      async function walk(prefix: string) {
        let offset = 0;
        while (true) {
          const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
          if (error) return;
          if (!data || data.length === 0) break;
          for (const item of data) {
            const isFolder = !item.metadata;
            const nextPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (isFolder) {
              await walk(nextPath);
            } else {
              total += Number(item.metadata?.size ?? 0);
              count += 1;
            }
          }
          if (data.length < 1000) break;
          offset += data.length;
        }
      }
      await walk("");
      return { bucket, bytes: total, files: count };
    }

    const buckets = await Promise.all([sumBucket("resources"), sumBucket("branding")]);
    const totalBytes = buckets.reduce((a, b) => a + b.bytes, 0);
    const totalFiles = buckets.reduce((a, b) => a + b.files, 0);
    return { buckets, totalBytes, totalFiles };
  });
