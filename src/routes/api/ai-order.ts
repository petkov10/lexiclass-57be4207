import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = {
  className?: string | null;
  subject?: string | null;
  themes?: Array<{ id: string; name: string; description?: string | null }>;
};

/** Предлага логична (методически издържана) подредба на темите. */
export const Route = createFileRoute("/api/ai-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const themes = (body.themes ?? []).filter((t) => t && t.id && t.name).slice(0, 120);
        if (themes.length < 2) return new Response("Нужни са поне 2 теми", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Ти си методист. Подреждаш темите по логика на изучаване: от основи към надграждащо, с уважение към предпоставките между темите.
Отговаряй САМО с валиден JSON: { "order": string[], "notes": string }
- order: ВСИЧКИ подадени id-та, точно веднъж всяко, в предложения ред.
- notes: 2–4 изречения на български защо е тази подредба и какво да провери учителят.
Без markdown.`;

        const usr = `Предмет: ${body.subject || "—"}\nКлас: ${body.className || "—"}\nТеми (id — име — описание):\n${themes
          .map((t) => `${t.id} — ${t.name}${t.description ? ` — ${t.description}` : ""}`)
          .join("\n")}`;

        const res = await aiChat({
          model: "google/gemini-3.7-flash",
          temperature: 0.2,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          response_format: { type: "json_object" },
        });
        if (!res.ok) return aiErrorResponse(res.status, await res.text());
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { order?: string[]; notes?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }

        // Валидираме: само познати id-та, без дубликати, липсващите отиват накрая.
        const known = new Set(themes.map((t) => t.id));
        const seen = new Set<string>();
        const order: string[] = [];
        for (const id of Array.isArray(parsed.order) ? parsed.order : []) {
          if (typeof id === "string" && known.has(id) && !seen.has(id)) {
            seen.add(id);
            order.push(id);
          }
        }
        for (const t of themes) if (!seen.has(t.id)) order.push(t.id);

        return Response.json({ order, notes: typeof parsed.notes === "string" ? parsed.notes : "" });
      },
    },
  },
});
