import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";
import { userContent } from "@/lib/ai-file";

type Body = { topic?: string; count?: number; context?: string; file?: { name?: string; mime?: string; data?: string } };

export const Route = createFileRoute("/api/ai-flashcards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const topic = (body.topic || "").trim();
        if (!topic && !body.file?.data) return new Response("Липсва тема или файл", { status: 400 });
        const count = Math.min(Math.max(body.count ?? 10, 3), 25);

        const sys = `Ти си учител, който създава флаш карти за ученици. Отговаряй САМО с валиден JSON по схемата { "flashcards": [ { "front": string, "back": string } ] }. Без обяснения, без markdown, без \`\`\`. Картите трябва да са на български език, кратки и ясни. Лицевата страна е въпрос или понятие, обратната — отговор или дефиниция.`;
        const usr = `Тема: ${topic}\nБрой карти: ${count}${body.context ? `\nДопълнителен контекст: ${body.context}` : ""}`;

        const res = aiChat({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "system", content: `${sys}\n\n${AI_GUARDRAILS}` }, { role: "user", content: userContent(usr, body.file) }],
            response_format: { type: "json_object" },
          });

        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }

        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { flashcards?: Array<{ front: string; back: string }> } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) try { parsed = JSON.parse(m[0]); } catch { /* noop */ }
        }
        const flashcards = (parsed.flashcards ?? []).filter(
          (c) => c && typeof c.front === "string" && typeof c.back === "string"
        );
        return Response.json({ flashcards });
      },
    },
  },
});
