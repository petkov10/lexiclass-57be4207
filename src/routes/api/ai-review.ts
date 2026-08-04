import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = { text?: string; kind?: string };

export const Route = createFileRoute("/api/ai-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as Body;
        const text = (body.text || "").trim();
        if (!text) return new Response("Липсва документ за проверка", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Ти си експерт-методист, който рецензира училищна документация и методически разработки.
Прегледай подадения документ и върни кратка рецензия в Markdown със следната структура:

## Обща оценка
(2–3 изречения)

## Липсващи или непълни елементи
(булети — какво липсва спрямо обичайната структура на този тип документ)

## Конкретни препоръки
(булети — приложими и конкретни)

## Езикови и оформителски бележки
(булети; ако няма — напиши „Няма съществени бележки.“)

Не пренаписвай целия документ. Не измисляй нормативни цитати. Ако документът е непълен или неясен, кажи го директно.`;

        const usr = `ВИД ДОКУМЕНТ: ${body.kind || "неуточнен"}

ДОКУМЕНТ:
${text.slice(0, 60000)}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          }),
        });
        if (!res.ok) {
          if (res.status === 429) return new Response("Прекалено много заявки.", { status: 429 });
          if (res.status === 402) return new Response("Изчерпан AI кредит.", { status: 402 });
          return new Response(await res.text(), { status: res.status });
        }
        const json = await res.json();
        return Response.json({ review: json.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
