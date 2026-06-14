import { createFileRoute } from "@tanstack/react-router";

type Body = {
  topic?: string;
  duration?: number;
  grade?: string;
  context?: string;
  lesson_type?: "new" | "practice" | "review" | "assessment";
  methods?: string;
};

const TYPE_LABEL: Record<NonNullable<Body["lesson_type"]>, string> = {
  new: "Нов учебен материал",
  practice: "Упражнение / Затвърждаване",
  review: "Обобщение / Систематизация",
  assessment: "Оценяване / Контрол",
};

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
        const lessonTypeLabel = body.lesson_type ? TYPE_LABEL[body.lesson_type] : "";

        const sys = `Ти си опитен български учител-методист с дългогодишен опит в подготовката на педагогически разработки.
СПАЗВАЙ:
- Държавните образователни стандарти (ДОС) на МОН
- Таксономията на Блум (знание → разбиране → приложение → анализ → синтез → оценка)
- Активни и интерактивни методи (работа по групи, дискусия, проблемно обучение, обърната класна стая, проектно-базирано обучение)
- Диференциран подход (за слабо/средно/силно представящи се ученици)
- Междупредметни връзки
- Ключови компетентности по европейска рамка

Връщай отговора САМО в чист Markdown със следната структура:

# Тема: {име}
**Клас:** ... · **Предмет:** ... · **Тип урок:** ... · **Продължителност:** ... мин

## 1. Цели на урока
### Образователни (Какво ще научат)
- ...
### Развиващи (Какви умения ще развият)
- ...
### Възпитателни (Какви ценности/нагласи)
- ...

## 2. Очаквани резултати (по таксономия на Блум)
В края на урока ученикът ще може да:
- **Знание:** ...
- **Разбиране:** ...
- **Приложение:** ...
- (по-високите нива, ако е приложимо)

## 3. Ключови компетентности
- ...

## 4. Междупредметни връзки
- ...

## 5. Необходими ресурси и средства
- ...

## 6. Ход на урока
| Време | Етап | Дейност на учителя | Дейност на учениците | Методи/Средства |
|---|---|---|---|---|
| 0–5 мин | Организационен момент | ... | ... | ... |
| 5–10 мин | Мотивация / Актуализация | ... | ... | ... |
| 10–25 мин | Нов материал / Основна част | ... | ... | ... |
| 25–35 мин | Затвърждаване | ... | ... | ... |
| 35–43 мин | Обобщение | ... | ... | ... |
| 43–45 мин | Рефлексия и ДЗ | ... | ... | ... |

## 7. Диференциран подход
- **За затрудняващи се ученици:** ...
- **За средно представящи се:** ...
- **За напреднали:** ...

## 8. Оценяване
- Формиращо оценяване по време на урока: ...
- Критерии: ...

## 9. Домашна работа
...

## 10. Рефлексия и самооценка на учителя
- Какво да наблюдавам ...
- Възможни затруднения и решения: ...

Бъди конкретен, практичен, с реални примери и времеви маркери.`;

        const usr = `Тема: ${topic}\nПродължителност: ${duration} минути${body.grade ? `\nКлас: ${body.grade}` : ""}${lessonTypeLabel ? `\nТип урок: ${lessonTypeLabel}` : ""}${body.methods ? `\nПредпочитани методи: ${body.methods}` : ""}${body.context ? `\nДопълнителен контекст: ${body.context}` : ""}`;

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
