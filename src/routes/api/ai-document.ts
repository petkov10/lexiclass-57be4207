import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";
import { DOC_TEMPLATES } from "@/lib/doc-templates";

type Body = { kind?: string; fields?: Record<string, string>; extra?: string };

const SYSTEM = `Ти си експерт по училищна документация в България — бивш експерт в РУО и дългогодишен учител-методист.
Изготвяш ГОТОВИ ЗА УПОТРЕБА официални училищни документи, които съответстват на:
- ЗПУО и подзаконовите наредби (Наредба № 5 за общообразователната подготовка, Наредба № 10 за организацията на дейностите, Наредба № 11 за оценяване на резултатите, Наредба № 13 за гражданското, здравното, екологичното и интеркултурното образование, Наредба № 15 за статута и професионалното развитие на педагогическите специалисти, Наредбата за приобщаващото образование);
- учебните програми на МОН и Държавните образователни стандарти;
- ревизираната таксономия на Блум и европейските ключови компетентности;
- изискванията на GDPR — не измисляй лични данни; където липсва информация, оставяй попълваемо поле „…………“.

ПРАВИЛА ЗА ОТГОВОРА:
1. Връщай САМО чист Markdown — без уводни/заключителни коментари, без code fences.
2. Спазвай точно зададената структура на документа.
3. Използвай таблици (Markdown GFM) навсякъде, където документът го изисква.
4. Пиши на официален български административно-педагогически език.
5. Съдържанието да е КОНКРЕТНО и приложимо, а не общи фрази.
6. Накрая на документа добави ред за дата, изготвил и подпис, когато е уместно.
7. Никога не измисляй нормативни текстове, номера на протоколи или лични данни.`;

export const Route = createFileRoute("/api/ai-document")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const tpl = DOC_TEMPLATES.find((t) => t.id === body.kind);
        if (!tpl) return new Response("Непознат вид документ", { status: 400 });

        const fields = body.fields ?? {};
        const missing = tpl.fields.filter((f) => f.required && !(fields[f.key] || "").trim()).map((f) => f.label);
        if (missing.length) return new Response(`Липсват задължителни полета: ${missing.join(", ")}`, { status: 400 });

        const filled = tpl.fields
          .map((f) => ({ f, v: (fields[f.key] || "").trim() }))
          .filter((x) => x.v)
          .map((x) => `- ${x.f.label}: ${x.v}`)
          .join("\n");

        const usr = `ВИД ДОКУМЕНТ: ${tpl.label}

СТРУКТУРА И НОРМАТИВНА РАМКА:
${tpl.spec}

ВЪВЕДЕНИ ДАННИ:
${filled || "(няма — използвай попълваеми полета)"}
${body.extra?.trim() ? `\nДОПЪЛНИТЕЛНИ УКАЗАНИЯ ОТ УЧИТЕЛЯ:\n${body.extra.trim()}` : ""}

Изготви пълния документ.`;

        const res = await aiChat({
            model: "google/gemini-3.7-flash",
            messages: [
              { role: "system", content: `${SYSTEM}\n\n${AI_GUARDRAILS}` },
              { role: "user", content: usr },
            ],
          });
        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content ?? "";
        return Response.json({ text, title: tpl.label });
      },
    },
  },
});
