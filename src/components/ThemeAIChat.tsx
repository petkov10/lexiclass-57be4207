import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Bot, User, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { aiFetch } from "@/lib/ai-client";
import type { ResourceRow } from "@/lib/types";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export function ThemeAIChat({
  themeName,
  themeDescription,
  resources,
}: {
  themeName: string;
  themeDescription?: string | null;
  resources: ResourceRow[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, open]);

  const systemPrompt = () => {
    const lines: string[] = [
      "Ти си учебен AI асистент. Отговаряй на български език, ясно и педагогически коректно.",
      `Темата на разговора е: „${themeName}".`,
    ];
    if (themeDescription) lines.push(`Описание на темата: ${themeDescription}`);
    if (resources.length) {
      lines.push("Ученикът има достъп до следните ресурси по темата:");
      resources.slice(0, 30).forEach((r, i) => {
        const bits = [r.title, r.description].filter(Boolean).join(" — ");
        lines.push(`${i + 1}. [${r.type}] ${bits}`);
      });
    }
    lines.push("Обяснявай стъпка по стъпка, давай примери и въпроси за самопроверка. Ако темата излиза от учебния материал, кажи го.");
    return lines.join("\n");
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const payload: Msg[] = [{ role: "system", content: systemPrompt() }, ...next];
      const res = await aiFetch("/api/ai", { messages: payload });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.message || "(няма отговор)" }]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

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
    <Card className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-6rem))] flex flex-col shadow-2xl border-2">
      <div className="flex items-center justify-between border-b p-3 gradient-soft">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><Sparkles className="h-4 w-4" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">AI асистент</div>
            <div className="text-[11px] text-muted-foreground truncate">{themeName}</div>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-3">Задайте въпрос по темата или пробвайте:</p>
            <div className="grid gap-2">
              {["Обясни основните понятия по темата.", "Дай ми 3 примерни задачи с решения.", "Направи кратко резюме за подготовка за тест."].map((p) => (
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
            <div className={`rounded-lg px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="prose prose-xs max-w-none dark:prose-invert prose-p:my-1"><Markdown>{m.content}</Markdown></div>
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
