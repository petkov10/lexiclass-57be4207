import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = { text?: string; kind?: string };

export const Route = createFileRoute("/api/ai-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

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

        const res = aiChat({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          });
        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }
        const json = await res.json();
        return Response.json({ review: json.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
