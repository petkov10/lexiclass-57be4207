import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";

type Body = { topic?: string; count?: number; context?: string };

export const Route = createFileRoute("/api/ai-flashcards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as Body;
        const topic = (body.topic || "").trim();
        if (!topic) return new Response("Липсва тема", { status: 400 });
        const count = Math.min(Math.max(body.count ?? 10, 3), 25);

        const sys = `Ти си учител, който създава флаш карти за ученици. Отговаряй САМО с валиден JSON по схемата { "flashcards": [ { "front": string, "back": string } ] }. Без обяснения, без markdown, без \`\`\`. Картите трябва да са на български език, кратки и ясни. Лицевата страна е въпрос или понятие, обратната — отговор или дефиниция.`;
        const usr = `Тема: ${topic}\nБрой карти: ${count}${body.context ? `\nДопълнителен контекст: ${body.context}` : ""}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) {
          if (res.status === 429) return new Response("Прекалено много заявки. Опитайте по-късно.", { status: 429 });
          if (res.status === 402) return new Response("Изчерпан AI кредит.", { status: 402 });
          return new Response(await res.text(), { status: res.status });
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
