import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiErrorResponse } from "@/lib/ai-call.server";
import { requireEditor } from "@/lib/api-auth.server";
import { AI_GUARDRAILS } from "@/lib/ai-guardrails";

type Body = {
  text?: string;
  subject?: string;
  className?: string;
  weeks?: number;
  file?: { name?: string; mime?: string; data?: string };
};

export const Route = createFileRoute("/api/ai-curriculum")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireEditor(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as Body;
        const text = (body.text || "").trim();
        const file = body.file;
        if (!text && !file?.data) return new Response("Липсва текст или файл", { status: 400 });
        const weeks = Math.min(Math.max(body.weeks ?? 0, 0), 72);

        const sys = `${AI_GUARDRAILS}

Ти си учител-методист, който изготвя тематично разпределение.
Превърни подадения текст/списък в подредена структура от теми.
Отговаряй САМО с валиден JSON: { "themes": [ { "week": number, "name": string, "description": string } ] }
Правила:
- Запази реда и формулировките от източника, когато са ясни; не измисляй нови теми, ако източникът е конкретен списък.
- "week" е поредният номер (1, 2, 3 …).
- "description" е кратко (1 изречение) и може да е празен низ, ако няма основание.
Без markdown, без обяснения.`;

        const usrText = `Предмет: ${body.subject || "—"}
Клас: ${body.className || "—"}${weeks ? `\nЖелан брой теми/часове: ${weeks}` : ""}

ИЗТОЧНИК:
${text || "(виж прикачения файл)"}`;

        const content: unknown[] = [{ type: "text", text: usrText }];
        if (file?.data) {
          const mime = file.mime || "application/pdf";
          if (mime.startsWith("image/")) {
            content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${file.data}` } });
          } else {
            content.push({ type: "file", file: { filename: file.name || "source", file_data: `data:${mime};base64,${file.data}` } });
          }
        }

        const res = aiChat({
            model: "google/gemini-3.6-flash",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: file?.data ? content : usrText },
            ],
            response_format: { type: "json_object" },
          });
        if (!res.ok) {
          return aiErrorResponse(res.status, await res.text());
        }
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { themes?: Array<{ week?: number; name?: string; description?: string }> } = {};
        try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ } }
        const themes = (parsed.themes ?? [])
          .filter((t) => t && typeof t.name === "string" && t.name.trim())
          .map((t, i) => ({
            week: Number.isFinite(t.week) ? Number(t.week) : i + 1,
            name: String(t.name).trim().slice(0, 300),
            description: typeof t.description === "string" ? t.description.trim() : "",
          }));
        return Response.json({ themes });
      },
    },
  },
});
