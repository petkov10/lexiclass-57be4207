import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json()) as { messages?: Msg[] };
        if (!Array.isArray(body.messages)) return new Response("Bad request", { status: 400 });

        const systemPrompt = {
          role: "system" as const,
          content: `Ти си AI асистент за български учител (основно по информатика и ИТ, но помагаш и по други предмети).

Помагаш с:
- педагогически материали (разработки, работни листове, дискусии, казуси, проекти);
- учебни задачи с условие, насоки, примерен вход/изход и пълно решение;
- обяснения на теми на разбираем за учениците език, с аналогии и примери;
- тестове, въпроси за проверка и критерии за оценяване;
- обобщаване и преработка на учебни материали.

Правила за качество:
1. Отговаряй конкретно и приложимо — без общи фрази и без преразказ на въпроса.
2. Структурирай с Markdown: заглавия, номерирани списъци, таблици (валиден Markdown синтаксис с | и разделителен ред).
3. Съобразявай нивото с посочения клас; ако липсва, кажи за кое ниво е подходящ отговорът.
4. Когато е даден контекст с ресурси, ползвай го като основен източник и се позовавай на конкретните заглавия.
5. Основните езици за примери са C# (csharp), HTML, CSS и SQL, освен ако не е поискано друго. Кодът е в блокове с правилен език.
6. Не давай отговор „наполовина“ — ако задачата иска решение, дай пълно решение.
7. Отговаряй на български език.

${AI_GUARDRAILS}`,
        };

        const res = await aiChat({
            model: "google/gemini-3.7-flash",
            temperature: 0.4,
            messages: [systemPrompt, ...body.messages],
          });

        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }

        const json = await res.json();
        const message = json.choices?.[0]?.message?.content ?? "";
        return Response.json({ message });
      },
    },
  },
});
