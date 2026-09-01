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
          content: `Ти си AI асистент за български учител по информатика и информационни технологии. Помагаш с:
- генериране на учебни задачи (с условие, насоки, примерен вход/изход, и пълно решение когато е по програмиране);
- обясняване на теми на разбираем за ученици език;
- създаване на тестове и въпроси;
- обобщаване на учебни материали.
Основните езици и технологии, които учителят преподава, са: C# (csharp), HTML, CSS и SQL. По подразбиране давай примерите и решенията на тези езици, освен ако потребителят изрично не поиска друго.
Отговаряй на български език. Използвай Markdown за форматиране. Кодът обвивай в кодови блокове с правилен език (\\\`\\\`\\\`csharp, \\\`\\\`\\\`html, \\\`\\\`\\\`css, \\\`\\\`\\\`sql).

${AI_GUARDRAILS}`,
        };

        const res = aiChat({
            model: "google/gemini-3.6-flash",
            messages: [systemPrompt, ...body.messages],
          });

        if (!res.ok) {
          const text = await res.text();
          return aiErrorResponse(res.status, await res.text());
        }

        const json = await res.json();
        const message = json.choices?.[0]?.message?.content ?? "";
        return Response.json({ message });
      },
    },
  },
});
