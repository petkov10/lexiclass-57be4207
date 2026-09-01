import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = { name?: string; subject?: string; className?: string; current?: string };

export const Route = createFileRoute("/api/ai-theme-meta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const name = (body.name || "").trim();
        if (!name) return new Response("Липсва име на темата", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Ти си учител-методист. За дадена учебна тема връщаш кратко описание и ключови думи.
Отговаряй САМО с валиден JSON: { "description": string, "tags": string[] }
- description: 1–2 изречения на български, конкретно какво ще усвоят учениците (до 220 знака).
- tags: 3–6 кратки ключови думи с малки букви, без диез.
Без markdown, без обяснения.`;
        const usr = `Тема: ${name}
Предмет: ${body.subject || "—"}
Клас: ${body.className || "—"}${body.current ? `\nСъществуващо описание (подобри го): ${body.current}` : ""}`;

        const res = aiChat({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
            response_format: { type: "json_object" },
          });
        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { description?: string; tags?: string[] } = {};
        try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ } }
        return Response.json({
          description: typeof parsed.description === "string" ? parsed.description : "",
          tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string").slice(0, 8) : [],
        });
      },
    },
  },
});
