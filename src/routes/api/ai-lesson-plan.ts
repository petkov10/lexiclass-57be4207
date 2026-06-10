import { createFileRoute } from "@tanstack/react-router";

type Body = { topic?: string; duration?: number; grade?: string; context?: string };

export const Route = createFileRoute("/api/ai-lesson-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const body = (await request.json()) as Body;
        const topic = (body.topic || "").trim();
        if (!topic) return new Response("Липсва тема", { status: 400 });
        const duration = body.duration ?? 45;

        const sys = `Ти си опитен български учител. Създай подробен план за урок на български в Markdown формат със следната структура:
# Тема: ...
**Клас:** ... · **Продължителност:** ... мин

## Цели на урока
- ...

## Необходими ресурси
- ...

## Ход на урока
| Време | Дейност | Бележки |
|---|---|---|
| 0–5 мин | Въведение | ... |
...

## Домашна работа
...

## Бележки за учителя
...

Бъди конкретен и практичен. Включи времеви маркери за всяка част.`;
        const usr = `Тема: ${topic}\nПродължителност: ${duration} минути${body.grade ? `\nКлас: ${body.grade}` : ""}${body.context ? `\nКонтекст: ${body.context}` : ""}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          }),
        });
        if (!res.ok) {
          if (res.status === 429) return new Response("Прекалено много заявки.", { status: 429 });
          if (res.status === 402) return new Response("Изчерпан AI кредит.", { status: 402 });
          return new Response(await res.text(), { status: res.status });
        }
        const json = await res.json();
        return Response.json({ plan: json.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
