import { useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Bot, User, X, Copy, Trash2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { aiFetch } from "@/lib/ai-client";
import { useAuth, useRole } from "@/hooks/useAuth";
import { classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const HISTORY_TURNS = 14;

/** Кратко описание на текущия екран, за да е конкретен асистентът. */
function pageInfo(pathname: string): { label: string; hint: string } {
  const p = pathname;
  if (p.startsWith("/admin/themes")) return { label: "Тематично разпределение", hint: "Учителят подрежда теми по клас и предмет, може да ги импортира от Excel или да ги генерира с AI." };
  if (p.startsWith("/admin/resources")) return { label: "Ресурси", hint: "Тук се добавят и подреждат учебни ресурси към темите." };
  if (p.startsWith("/admin/ai")) return { label: "AI асистенти", hint: "Генериране на разработки на урок, тестове, документи и упражнения." };
  if (p.startsWith("/admin/schedule")) return { label: "Разписание", hint: "Седмичен график на часовете." };
  if (p.startsWith("/admin/classes")) return { label: "Класове", hint: "Управление на класовете." };
  if (p.startsWith("/admin/subjects")) return { label: "Предмети", hint: "Управление на предметите." };
  if (p.startsWith("/admin/import")) return { label: "Импорт от папка", hint: "Групово качване на файлове като ресурси." };
  if (p.startsWith("/admin/backup")) return { label: "Миграция и архив", hint: "Сваляне и възстановяване на съдържанието." };
  if (p.startsWith("/admin")) return { label: "Администрация", hint: "Работен панел на учителя." };
  if (p.startsWith("/class")) return { label: "Клас", hint: "Преглед на предметите и темите на класа." };
  return { label: "Начало", hint: "Публичен изглед с класове, търсене и последни теми." };
}

/**
 * Плаващ AI помощник, достъпен на всяка страница за влезли учители.
 * Знае къде се намира потребителят и какво съдържа платформата.
 */
export function GlobalAIChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { role } = useRole(user?.id);
  const canUseAI = role === "admin" || role === "editor";
  // На страницата на темата вече има специализиран асистент.
  const hidden = pathname.startsWith("/theme/") || pathname.startsWith("/auth");

  const { data: classes } = useQuery({ ...classesQuery, enabled: canUseAI && !hidden });
  const { data: subjects } = useQuery({ ...subjectsQuery, enabled: canUseAI && !hidden });
  const { data: themes } = useQuery({ ...allThemesQuery, enabled: canUseAI && !hidden });

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, open]);

  const page = pageInfo(pathname);

  const quick = useMemo(
    () => [
      "Как да свърша най-бързо това, което съм отворил в момента?",
      "Предложи ми план за следващия учебен час.",
      "Дай ми идеи какви ресурси да добавя по този предмет.",
      "Помогни ми да формулирам ясни цели и очаквани резултати за урок.",
    ],
    [],
  );

  const systemPrompt = useMemo(() => {
    const lines: string[] = [
      "Ти си AI помощник в учителската платформа LexiClass и работиш само с учители.",
      "Помагаш едновременно с две неща: (1) методическа работа — уроци, задачи, оценяване; (2) работа със самата платформа — как да добави клас, предмет, тема, ресурс, тест, разписание.",
      "",
      "ПРАВИЛА:",
      "1. Отговаряй на български, кратко и структурирано с Markdown.",
      "2. Давай готови за ползване формулировки, а не общи съвети.",
      "3. Когато въпросът е за платформата, дай стъпки с имената на екраните от менюто.",
      "4. Не измисляй нормативни текстове, номера на наредби, източници или данни. При несигурност пиши: „Нямам сигурна информация за това — проверете в актуалния документ.“",
      "5. Завършвай с 1–3 конкретни следващи стъпки, когато е уместно.",
      "",
      "КОНТЕКСТ",
      `Текущ екран: ${page.label}. ${page.hint}`,
    ];
    if (classes?.length) lines.push(`Класове: ${classes.map((c) => c.name).slice(0, 30).join(", ")}`);
    if (subjects?.length) lines.push(`Предмети: ${subjects.map((s) => s.name).slice(0, 30).join(", ")}`);
    if (themes?.length) {
      lines.push(`Общо теми: ${themes.length}. Примерни: ${themes.slice(0, 25).map((t) => t.name).join("; ")}`);
    }
    return lines.join("\n");
  }, [page.label, page.hint, classes, subjects, themes]);

  const ask = async (history: Msg[]) => {
    setLoading(true);
    try {
      const payload: Msg[] = [{ role: "system", content: systemPrompt }, ...history.slice(-HISTORY_TURNS)];
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

  if (!canUseAI || hidden) return null;

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 px-5 gradient-bg text-primary-foreground"
      >
        <Sparkles className="h-5 w-5" /> AI помощник
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[min(440px,calc(100vw-2rem))] h-[min(640px,calc(100vh-6rem))] flex flex-col shadow-2xl border-2">
      <div className="flex items-center justify-between border-b p-3 gradient-soft">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><Sparkles className="h-4 w-4" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">AI помощник</div>
            <div className="text-[11px] text-muted-foreground truncate">{page.label}</div>
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
            <p className="mb-3 text-center">Помощникът вижда къде се намирате. Питайте или изберете:</p>
            <div className="grid gap-2">
              {quick.map((p) => (
                <button key={p} onClick={() => send(p)} className="text-left rounded-lg border p-2 hover:bg-accent text-xs">{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role !== "user" && <div className="h-7 w-7 rounded-md bg-muted grid place-items-center shrink-0"><Bot className="h-4 w-4" /></div>}
            <div className={`rounded-lg px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "user" ? (
                <span className="whitespace-pre-wrap">{m.content}</span>
              ) : (
                <>
                  <div className="prose prose-sm max-w-none dark:prose-invert"><Markdown>{m.content}</Markdown></div>
                  <button
                    className="mt-1 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Копирано"); }}
                  >
                    <Copy className="h-3 w-3" /> Копирай
                  </button>
                </>
              )}
            </div>
            {m.role === "user" && <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center shrink-0"><User className="h-4 w-4" /></div>}
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">AI пише…</div>}
        <div ref={endRef} />
      </div>

      <div className="border-t p-2 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Попитайте нещо…"
          rows={2}
          className="resize-none text-sm"
        />
        <Button onClick={() => void send()} disabled={loading || !input.trim()} className="shrink-0 self-end"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
