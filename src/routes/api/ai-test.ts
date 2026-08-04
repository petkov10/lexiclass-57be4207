import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";
import { userContent } from "@/lib/ai-file";

type Body = {
  topic?: string;
  count?: number;
  kind?: "multiple_choice" | "open" | "mixed";
  context?: string;
  file?: { name?: string; mime?: string; data?: string };
};

export const Route = createFileRoute("/api/ai-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const body = (await request.json()) as Body;
        const topic = (body.topic || "").trim();
        if (!topic && !body.file?.data) return new Response("Липсва тема или файл", { status: 400 });
        const count = Math.min(Math.max(body.count ?? 10, 3), 30);
        const kind = body.kind ?? "multiple_choice";

        const sys = `Ти си учител по информатика. Създай тест на български. Отговаряй САМО с валиден JSON по схемата:
{ "title": string, "questions": [ { "q": string, "type": "mc" | "open", "options"?: string[], "answer": string, "explanation"?: string } ] }
Без markdown, без \`\`\`. За multiple choice (type "mc") давай точно 4 опции и в "answer" посочи точния текст на верния отговор.${body.file?.data ? "\nБазирай въпросите САМО върху съдържанието на прикачения файл." : ""}`;
        const usr = `Тема: ${topic || "(от прикачения файл)"}\nБрой въпроси: ${count}\nТип: ${kind === "open" ? "отворени въпроси" : kind === "mixed" ? "смесен (mc + open)" : "multiple choice"}${body.context ? `\nКонтекст: ${body.context}` : ""}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            messages: [
              { role: "system", content: `${sys}\n\n${AI_GUARDRAILS}` },
              { role: "user", content: userContent(usr, body.file) },
            ],
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
        let parsed: any = {};
        try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ } }
        return Response.json({ test: parsed });
      },
    },
  },
});
