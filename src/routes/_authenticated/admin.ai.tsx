import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, User, Bot } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Генерирай 3 задачи по Python за начинаещи с условия, входове и решения.",
  "Обясни понятието „рекурсия“ на ученик в 8 клас.",
  "Създай тест с 10 въпроса с избор по темата „Линейни уравнения“.",
  "Кратко резюме на основните теми за алгоритми и сложност за 11 клас.",
];

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AIPage,
});

function AIPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.message || "(няма отговор)" }]);
    } catch (e: any) {
      toast.error(e.message || "Грешка");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="text-primary" /> AI Асистент</h1>
        <p className="text-sm text-muted-foreground mt-1">Помощник за задачи, обяснения, тестове и резюмета.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="font-semibold">С какво да помогна?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Изберете готова заявка или напишете собствена.</p>
              <div className="grid sm:grid-cols-2 gap-2 w-full">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => send(p)} className="text-left text-sm rounded-lg border p-3 hover:bg-accent transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Message key={i} m={m} />)
          )}
          {loading && <Message m={{ role: "assistant", content: "..." }} />}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Напишете заявка... (Shift+Enter за нов ред)"
            rows={2}
            className="resize-none"
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()} size="lg"><Send /></Button>
        </div>
      </Card>
    </div>
  );
}

function Message({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`rounded-lg px-4 py-2.5 max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-background prose-pre:text-foreground">
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
