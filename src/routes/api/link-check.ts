import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";

type Body = { urls?: string[] };

/** Проверява дали външните връзки на ресурсите още работят. */
export const Route = createFileRoute("/api/link-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json()) as Body;
        const urls = (body.urls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 60);

        const results = await Promise.all(
          urls.map(async (url) => {
            try {
              let res = await fetch(url, { method: "HEAD", redirect: "follow" });
              if (res.status === 405 || res.status === 501) {
                res = await fetch(url, { method: "GET", redirect: "follow" });
              }
              return { url, status: res.status, ok: res.ok };
            } catch {
              return { url, status: 0, ok: false, error: "Няма връзка" };
            }
          })
        );

        return Response.json({ results });
      },
    },
  },
});
