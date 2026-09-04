import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = {
  title?: string;
  type?: string;
  description?: string | null;
  text?: string | null;
  url?: string | null;
  theme?: string | null;
  className?: string | null;
};

/** Кратко учителско резюме на един ресурс: за какво е, ключови понятия, въпроси. */
export const Route = createFileRoute("/api/ai-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const title = (body.title || "").trim();
        if (!title) return new Response("Липсва ресурс", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Ти си учител-методист. Правиш кратко работно резюме на учебен ресурс за колега учител.
Структура на отговора (Markdown):
## За какво е
1–3 изречения.
## Ключови понятия
5–8 буле́та, всяко с едно кратко пояснение.
## Как да го използвам в час
3 конкретни идеи (дейност + приблизително време).
## Въпроси за проверка
5 въпроса с кратък очакван отговор.
Ако наличната информация е малка (само заглавие или линк), кажи го изрично в началото и дай само това, което е обосновано.`;

        const usr = [
          `Заглавие: ${title}`,
          `Тип: ${body.type || "—"}`,
          body.theme ? `Тема: ${body.theme}` : "",
          body.className ? `Клас: ${body.className}` : "",
          body.description ? `Описание: ${body.description}` : "",
          body.url ? `Връзка: ${body.url}` : "",
          body.text ? `\nСъдържание:\n${String(body.text).slice(0, 14000)}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const res = await aiChat({
          model: "google/gemini-3.7-flash",
          temperature: 0.3,
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
