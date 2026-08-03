import { createFileRoute } from "@tanstack/react-router";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
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

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            messages: [systemPrompt, ...body.messages],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 429) return new Response("Rate limit exceeded. Опитайте по-късно.", { status: 429 });
          if (res.status === 402) return new Response("Изчерпан кредит за AI. Моля, добавете кредити в работното пространство.", { status: 402 });
          return new Response(text || "AI error", { status: res.status });
        }

        const json = await res.json();
        const message = json.choices?.[0]?.message?.content ?? "";
        return Response.json({ message });
      },
    },
  },
});
