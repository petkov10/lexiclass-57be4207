import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Bot, User, X, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { aiFetch } from "@/lib/ai-client";
import type { ResourceRow } from "@/lib/types";
import { useAuth, useRole } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant" | "system"; content: string };

/** Колко символа от текстовите ресурси да подадем като контекст на модела. */
const CONTEXT_BUDGET = 12000;
/** Колко реплики от разговора да пращаме назад (пази точност и разход). */
const HISTORY_TURNS = 14;

const QUICK = [
  "Обясни основните понятия по темата с прости думи и примери.",
  "Дай 3 практически задачи с решения, подходящи за час.",
  "Направи кратко резюме за подготовка за тест (до 10 реда).",
  "Кои са типичните грешки на учениците по тази тема и как да ги предотвратя?",
  "Предложи 5 въпроса за проверка на разбирането с очаквани отговори.",
];

/** Изважда полезен текст от съдържанието на ресурс (бележки, разработки, задачи). */
function resourceText(r: ResourceRow): string {
  const c = (r.content ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["text", "statement", "hints", "code", "solution"]) {
    const v = c[key];
    if (typeof v === "string" && v.trim()) parts.push(`${key}: ${v.trim()}`);
  }
  const cards = (c as { flashcards?: Array<{ front?: string; back?: string }> }).flashcards;
  if (Array.isArray(cards) && cards.length) {
    parts.push(cards.slice(0, 20).map((f) => `Q: ${f.front ?? ""} → A: ${f.back ?? ""}`).join("\n"));
  }
  return parts.join("\n");
}

export function ThemeAIChat({
  themeName,
  themeDescription,
  resources,
}: {
  themeName: string;
  themeDescription?: string | null;
  resources: ResourceRow[];
}) {
  // AI usage costs credits, so the assistant is available to signed-in
  // teachers (admin/editor) only.
  const { user } = useAuth();
  const { role } = useRole(user?.id);
  const canUseAI = role === "admin" || role === "editor";
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, open]);

  const systemPrompt = useMemo(() => {
    const lines: string[] = [
      "Ти си опитен български учител-методист и AI асистент в приложението LexiClass.",
      "Работиш САМО с учители (не с ученици) — говори професионално, конкретно и приложимо в класната стая.",
      "",
      "КАК ОТГОВАРЯШ:",
      "1. Отговаряй на български, кратко и структурирано с Markdown (заглавия, списъци, таблици).",
      "2. Използвай приоритетно материалите по темата, дадени по-долу. Ако отговорът идва от тях — позовавай се на конкретния ресурс по заглавие.",
      "3. Ако въпросът излиза извън дадените материали, кажи го изрично, преди да отговориш от общите си знания.",
      "4. Съобразявай нивото с посочения клас; при липса на клас — питай накратко или приеми среден гимназиален етап и го отбележи.",
      "5. Практичност пред теория: давай готови за ползване формулировки, задачи, въпроси и примери.",
      "6. Код давай в кодов блок с правилен език (csharp, html, css, sql), с кратко обяснение.",
      "7. Завършвай с 1–3 конкретни следващи стъпки, когато е уместно.",
      "",
      "ДОСТОВЕРНОСТ (най-висок приоритет):",
      "- Не измисляй факти, нормативни текстове, членове, номера на наредби, дати, източници или литература. Ако не си сигурен, напиши: „Нямам сигурна информация за това — проверете в актуалния документ.“",
      "- Не измисляй лични данни и оценки — оставяй попълваеми полета.",
      "",
      "КОНТЕКСТ",
      `Тема: „${themeName}“.`,
    ];
    if (themeDescription) lines.push(`Описание: ${themeDescription}`);

    if (resources.length) {
      lines.push("", "Ресурси по темата:");
      resources.slice(0, 40).forEach((r, i) => {
        const bits = [r.title, r.description].filter(Boolean).join(" — ");
        lines.push(`${i + 1}. [${r.type}] ${bits}`);
      });

      let budget = CONTEXT_BUDGET;
      const excerpts: string[] = [];
      for (const r of resources) {
        if (budget <= 0) break;
        const text = resourceText(r);
        if (!text) continue;
        const slice = text.slice(0, Math.min(3000, budget));
        budget -= slice.length;
        excerpts.push(`--- ${r.title} (${r.type}) ---\n${slice}`);
      }
      if (excerpts.length) {
        lines.push("", "Извадки от съдържанието на ресурсите (използвай ги като основен източник):", ...excerpts);
      }
    }
    return lines.join("\n");
  }, [themeName, themeDescription, resources]);

  const ask = async (history: Msg[]) => {
    setLoading(true);
    try {
      const trimmed = history.slice(-HISTORY_TURNS);
      const payload: Msg[] = [{ role: "system", content: systemPrompt }, ...trimmed];
      const res = await aiFetch("/api/ai", { messages: payload });
      if (!res.ok) throw new Error((await res.text()) || "Грешка при AI заявката.");
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.message || "(няма отговор)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Неуспешна заявка";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    await ask(next);
  };

  const retry = async () => {
    if (loading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const upToUser = messages.slice(0, messages.lastIndexOf(lastUser) + 1);
    setMessages(upToUser);
    await ask(upToUser);
  };

  if (!canUseAI) return null;

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 px-5 gradient-bg text-primary-foreground"
      >
        <Sparkles className="h-5 w-5" /> Питай AI за темата
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[min(440px,calc(100vw-2rem))] h-[min(640px,calc(100vh-6rem))] flex flex-col shadow-2xl border-2">
      <div className="flex items-center justify-between border-b p-3 gradient-soft">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><Sparkles className="h-4 w-4" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">AI асистент за учителя</div>
            <div className="text-[11px] text-muted-foreground truncate">{themeName} · {resources.length} ресурса в контекста</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" title="Изчисти разговора" onClick={() => setMessages([])}><Trash2 className="h-4 w-4" /></Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="text-muted-foreground py-6">
            <p className="mb-3 text-center">Асистентът вижда ресурсите по темата. Питайте или изберете:</p>
            <div className="grid gap-2">
              {QUICK.map((p) => (
                <button key={p} onClick={() => send(p)} className="text-left rounded-lg border p-2 hover:bg-accent text-xs">{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={`rounded-lg px-3 py-2 max-w-[85%] group ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="prose prose-xs max-w-none dark:prose-invert prose-p:my-1 prose-table:text-xs"><Markdown>{m.content}</Markdown></div>
              {m.role === "assistant" && (
                <div className="mt-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Копирано"); }}
                  >
                    <Copy className="h-3 w-3" /> Копирай
                  </button>
                  {i === messages.length - 1 && (
                    <button className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={retry}>
                      <RotateCcw className="h-3 w-3" /> Нов опит
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">AI пише…</div>}
        <div ref={endRef} />
      </div>
      <div className="border-t p-2 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Питай нещо по темата…"
          rows={2}
          className="resize-none text-sm min-h-0"
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
