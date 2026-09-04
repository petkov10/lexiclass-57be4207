import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = {
  title?: string;
  type?: string;
  theme?: string | null;
  className?: string | null;
  subject?: string | null;
  current?: string | null;
};

/** Кратко описание на ресурс, което да се попълни автоматично във формата. */
export const Route = createFileRoute("/api/ai-resource-meta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const title = (body.title || "").trim();
        if (!title) return new Response("Липсва заглавие", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Пишеш кратко описание на учебен ресурс за учителска платформа.
Отговаряй САМО с валиден JSON: { "description": string }
- 1–2 изречения на български, до 200 знака, конкретно за какво служи ресурсът и кога да се ползва.
- Без markdown, без кавички около описанието, без измислени детайли за съдържанието.`;

        const usr = [
          `Заглавие: ${title}`,
          `Тип: ${body.type || "—"}`,
          body.theme ? `Тема: ${body.theme}` : "",
          body.subject ? `Предмет: ${body.subject}` : "",
          body.className ? `Клас: ${body.className}` : "",
          body.current ? `Съществуващо описание (подобри го): ${body.current}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const res = await aiChat({
          model: "google/gemini-3.7-flash",
          temperature: 0.4,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          response_format: { type: "json_object" },
        });
        if (!res.ok) return aiErrorResponse(res.status, await res.text());
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { description?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
        return Response.json({ description: typeof parsed.description === "string" ? parsed.description : "" });
      },
    },
  },
});
