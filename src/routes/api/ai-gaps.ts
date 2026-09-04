import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type ThemeStat = {
  name: string;
  description?: string | null;
  total: number;
  types: string[];
};

type Body = { className?: string | null; subject?: string | null; themes?: ThemeStat[] };

/** Проверка за пропуски: кои теми нямат достатъчно или разнообразни ресурси. */
export const Route = createFileRoute("/api/ai-gaps")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const themes = (body.themes ?? []).slice(0, 120);
        if (!themes.length) return new Response("Няма теми за анализ", { status: 400 });

        const sys = `${AI_GUARDRAILS}

Ти си методист, който прави преглед на учебно съдържание.
Върни Markdown отчет:
## Обобщение
2–3 изречения — общо състояние.
## Теми с пропуски
Таблица: Тема | Какво липсва | Приоритет (висок/среден/нисък)
## Какво да добавя първо
Номериран списък с 5 конкретни стъпки (тема + точно какъв ресурс).
Правила: базирай се САМО на подадените данни; не измисляй теми и ресурси. Добър минимум за тема: обяснителен материал (презентация/документ), поне едно упражнение/задача и средство за проверка (тест или флаш карти). Пиши на български.`;

        const usr = `Предмет: ${body.subject || "—"}\nКлас: ${body.className || "—"}\nТеми (име | брой ресурси | типове | има ли описание):\n${themes
          .map((t) => `${t.name} | ${t.total} | ${t.types.join(", ") || "няма"} | ${t.description ? "да" : "не"}`)
          .join("\n")}`;

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
