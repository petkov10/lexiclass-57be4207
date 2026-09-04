import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = {
  theme?: string;
  description?: string | null;
  className?: string | null;
  subject?: string | null;
  resources?: string[];
  context?: string | null;
  count?: number;
  level?: string;
};

/** Готови за час задачи по конкретна тема, с решения за учителя. */
export const Route = createFileRoute("/api/ai-tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const theme = (body.theme || "").trim();
        if (!theme) return new Response("Липсва тема", { status: 400 });
        const count = Math.min(Math.max(Number(body.count) || 5, 1), 12);

        const sys = `${AI_GUARDRAILS}

Ти си опитен български учител. Съставяш практически задачи за учебен час.
Изисквания:
- Точно ${count} задачи, подредени по нарастваща трудност.
- Всяка задача: **Задача N — заглавие**, условие, очакван резултат, кратка насока за ученика и „Решение (за учителя)“.
- Ако темата е по програмиране, кодът е в блок с правилен език (csharp, html, css, sql), с примерен вход/изход.
- Накрая таблица „Критерии за оценяване“ (критерий | точки) и ред „Общо“.
- Съобрази трудността с посочения клас. Пиши на български, Markdown с валидни таблици.`;

        const usr = [
          `Тема: ${theme}`,
          `Предмет: ${body.subject || "—"}`,
          `Клас: ${body.className || "—"}`,
          `Ниво: ${body.level || "смесено"}`,
          body.description ? `Описание на темата: ${body.description}` : "",
          body.resources?.length ? `Налични ресурси по темата: ${body.resources.slice(0, 30).join("; ")}` : "",
          body.context ? `\nИзвадки от материалите:\n${String(body.context).slice(0, 10000)}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const res = await aiChat({
          model: "google/gemini-3.7-flash",
          temperature: 0.5,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
        });
        if (!res.ok) return aiErrorResponse(res.status, await res.text());
        const json = await res.json();
        return Response.json({ message: json.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
