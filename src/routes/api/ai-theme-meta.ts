import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = { name?: string; subject?: string; className?: string; current?: string };

export const Route = createFileRoute("/api/ai-theme-meta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

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

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          if (res.status === 429) return new Response("Прекалено много заявки.", { status: 429 });
          if (res.status === 402) return new Response("Изчерпан AI кредит.", { status: 402 });
          return new Response(await res.text(), { status: res.status });
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
