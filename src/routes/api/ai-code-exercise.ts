import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = { topic?: string; language?: string; level?: "beginner" | "intermediate" | "advanced"; context?: string };

export const Route = createFileRoute("/api/ai-code-exercise")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json()) as Body;
        const topic = (body.topic || "").trim();
        if (!topic) return new Response("Липсва тема", { status: 400 });
        const language = (body.language || "csharp").toLowerCase();
        const level = body.level ?? "beginner";

        const sys = `Ти си учител по програмиране. Създай задача за упражнение на български. Отговаряй САМО с валиден JSON:
{ "title": string, "statement": string, "hints": string, "language": string, "starter_code": string, "solution": string, "sample_input": string, "sample_output": string, "test_cases": [ { "input": string, "expected": string } ] }
Без markdown, без \`\`\` обвиване на целия JSON. Кодът да е чист, със смислени имена. Поне 3 тестови случая.`;
        const usr = `Тема: ${topic}\nЕзик: ${language}\nНиво: ${level}${body.context ? `\nКонтекст: ${body.context}` : ""}`;

        const res = await aiChat({
            model: "google/gemini-3.7-flash",
            messages: [{ role: "system", content: `${sys}\n\n${AI_GUARDRAILS}` }, { role: "user", content: usr }],
            response_format: { type: "json_object" },
          });
        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: any = {};
        try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ } }
        return Response.json({ exercise: parsed });
      },
    },
  },
});
