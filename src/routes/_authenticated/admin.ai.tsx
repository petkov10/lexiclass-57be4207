import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send, User, Bot, ClipboardList, BookOpen, Code2, Copy, Save, GraduationCap, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { allThemesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { QrCodeButton } from "@/components/QrCodeButton";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AIPage,
});

function AIPage() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="text-primary" /> AI Асистент</h1>
        <p className="text-sm text-muted-foreground mt-1">Чат, генериране на тестове, планове за урок и код упражнения.</p>
      </div>
      <Tabs defaultValue="chat">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="chat"><Bot className="h-4 w-4" /> Чат</TabsTrigger>
          <TabsTrigger value="test"><ClipboardList className="h-4 w-4" /> Тестове</TabsTrigger>
          <TabsTrigger value="plan"><BookOpen className="h-4 w-4" /> План за урок</TabsTrigger>
          <TabsTrigger value="pedagogy"><GraduationCap className="h-4 w-4" /> Педагогически</TabsTrigger>
          <TabsTrigger value="code"><Code2 className="h-4 w-4" /> Код упражнение</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-4"><Chat /></TabsContent>
        <TabsContent value="test" className="mt-4"><TestGen /></TabsContent>
        <TabsContent value="plan" className="mt-4"><PlanGen /></TabsContent>
        <TabsContent value="pedagogy" className="mt-4"><PedagogyGen /></TabsContent>
        <TabsContent value="code" className="mt-4"><CodeGen /></TabsContent>
      </Tabs>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string };
const QUICK_PROMPTS = [
  "Генерирай 3 задачи по C# за начинаещи.",
  "Прост HTML/CSS пример за адаптивна навигация.",
  "5 SQL заявки върху students(id,name,grade) с обяснение.",
  "Обясни рекурсия на разбираем език за 8 клас.",
];

function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.message || "(няма отговор)" }]);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-14rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3"><Sparkles className="h-6 w-6" /></div>
            <h2 className="font-semibold">С какво да помогна?</h2>
            <div className="grid sm:grid-cols-2 gap-2 w-full mt-4">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="text-left text-sm rounded-lg border p-3 hover:bg-accent">{p}</button>
              ))}
            </div>
          </div>
        ) : messages.map((m, i) => <Message key={i} m={m} />)}
        {loading && <Message m={{ role: "assistant", content: "..." }} />}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Напишете заявка..." rows={2} className="resize-none" />
        <Button onClick={() => send()} disabled={loading || !input.trim()} size="lg"><Send /></Button>
      </div>
    </Card>
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

function ThemePicker({ themeId, setThemeId, label = "Запази към тема (по желание)" }: { themeId: string; setThemeId: (v: string) => void; label?: string }) {
  const { data: themes } = useQuery(allThemesQuery);
  return (
    <div>
      <Label>{label}</Label>
      <Select value={themeId} onValueChange={setThemeId}>
        <SelectTrigger><SelectValue placeholder="— без запазване —" /></SelectTrigger>
        <SelectContent>{(themes ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function TestGen() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [kind, setKind] = useState<"multiple_choice" | "open" | "mixed">("multiple_choice");
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [themeId, setThemeId] = useState("");
  const [savedId, setSavedId] = useState<string>("");

  const gen = async () => {
    setLoading(true);
    setSavedId("");
    try {
      const res = await fetch("/api/ai-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, count, kind }) });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setTest(j.test);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!themeId || !test) return;
    const { data, error } = await supabase.from("resources").insert({
      theme_id: themeId, type: "test", title: test.title || topic,
      description: `${test.questions?.length ?? 0} въпроса`,
      content: test as any, order_index: 999,
    }).select("id").single();
    if (error) return toast.error(error.message);
    setSavedId(data.id);
    toast.success("Тестът е запазен — можете да го споделите с QR код");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_180px_auto] gap-3 items-end">
        <div><Label>Тема</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. SQL JOIN-и" /></div>
        <div><Label>Брой</Label><Input type="number" min={3} max={30} value={count} onChange={(e) => setCount(+e.target.value || 10)} /></div>
        <div><Label>Тип</Label><Select value={kind} onValueChange={(v) => setKind(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="multiple_choice">С избор</SelectItem>
          <SelectItem value="open">Отворени</SelectItem>
          <SelectItem value="mixed">Смесен</SelectItem>
        </SelectContent></Select></div>
        <Button onClick={gen} disabled={loading || !topic.trim()}><Sparkles /> {loading ? "..." : "Генерирай"}</Button>
      </div>

      {test && (
        <div className="space-y-3">
          <div>
            <Label>Заглавие на теста</Label>
            <Input value={test.title || ""} onChange={(e) => setTest({ ...test, title: e.target.value })} />
          </div>
          <div className="space-y-3">
            {(test.questions ?? []).map((q: any, i: number) => {
              const patch = (upd: any) => setTest({ ...test, questions: test.questions.map((x: any, j: number) => j === i ? { ...x, ...upd } : x) });
              const removeQ = () => setTest({ ...test, questions: test.questions.filter((_: any, j: number) => j !== i) });
              return (
                <Card key={i} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="text-xs font-semibold text-muted-foreground pt-2 w-6">{i + 1}.</div>
                    <Textarea rows={2} value={q.q || ""} onChange={(e) => patch({ q: e.target.value })} placeholder="Въпрос" />
                    <Select value={q.type || "mc"} onValueChange={(v) => patch({ type: v })}>
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mc">С избор</SelectItem>
                        <SelectItem value="open">Отворен</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={removeQ}>✕</Button>
                  </div>
                  {q.type === "mc" && (
                    <div className="pl-8 space-y-1">
                      {(q.options ?? []).map((o: string, j: number) => (
                        <div key={j} className="flex items-center gap-2">
                          <input type="radio" checked={q.answer === o} onChange={() => patch({ answer: o })} />
                          <Input value={o} onChange={(e) => {
                            const newOpts = [...q.options]; const old = newOpts[j]; newOpts[j] = e.target.value;
                            patch({ options: newOpts, answer: q.answer === old ? e.target.value : q.answer });
                          }} />
                          <Button variant="ghost" size="sm" onClick={() => patch({ options: q.options.filter((_: any, k: number) => k !== j) })}>✕</Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => patch({ options: [...(q.options ?? []), ""] })}>+ Опция</Button>
                    </div>
                  )}
                  {q.type === "open" && (
                    <div className="pl-8">
                      <Label className="text-xs">Верен отговор</Label>
                      <Input value={q.answer || ""} onChange={(e) => patch({ answer: e.target.value })} />
                    </div>
                  )}
                  <div className="pl-8">
                    <Label className="text-xs">Обяснение (по желание)</Label>
                    <Input value={q.explanation || ""} onChange={(e) => patch({ explanation: e.target.value })} />
                  </div>
                </Card>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setTest({ ...test, questions: [...(test.questions ?? []), { q: "", type: "mc", options: ["", "", "", ""], answer: "" }] })}>+ Добави въпрос</Button>
          </div>
          <div className="flex gap-2 items-end border-t pt-3 flex-wrap">
            <div className="flex-1 min-w-[200px]"><ThemePicker themeId={themeId} setThemeId={setThemeId} /></div>
            <Button onClick={save} disabled={!themeId}><Save /> Запази като ресурс</Button>
            {savedId && (
              <>
                <QrCodeButton url={`${typeof window !== "undefined" ? window.location.origin : ""}/test/${savedId}`} label="QR за теста" />
                <Button asChild variant="outline"><a href={`/test/${savedId}/print`} target="_blank" rel="noreferrer">Печат</a></Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function PlanGen() {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(45);
  const [grade, setGrade] = useState("");
  const [lessonType, setLessonType] = useState<"new" | "practice" | "review" | "assessment">("new");
  const [methods, setMethods] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("");
  const [themeId, setThemeId] = useState("");

  const gen = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-lesson-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, duration, grade, lesson_type: lessonType, methods }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setPlan(j.plan);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!themeId || !plan) return;
    const { error } = await supabase.from("resources").insert({
      theme_id: themeId, type: "lesson_plan", title: `План: ${topic}`,
      description: `${duration} мин${grade ? ` · ${grade}` : ""}${subject ? ` · ${subject}` : ""}`,
      content: { text: plan } as any, order_index: 999,
    });
    if (error) return toast.error(error.message);
    toast.success("Планът е запазен");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Тема на урока</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. Цикли в C#" /></div>
        <div><Label>Учебен предмет</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="напр. Информационни технологии" /></div>
        <div><Label>Клас</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="напр. 9А" /></div>
        <div><Label>Минути</Label><Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value || 45)} /></div>
        <div><Label>Тип урок</Label>
          <Select value={lessonType} onValueChange={(v) => setLessonType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Нов материал</SelectItem>
              <SelectItem value="practice">Упражнение</SelectItem>
              <SelectItem value="review">Обобщение</SelectItem>
              <SelectItem value="assessment">Оценяване</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Предпочитани методи (по желание)</Label>
          <Input value={methods} onChange={(e) => setMethods(e.target.value)} placeholder="напр. групова работа, обърната класна стая, PBL" /></div>
      </div>
      <Button onClick={gen} disabled={loading || !topic.trim()}><Sparkles /> {loading ? "Генериране..." : "Генерирай методическа разработка"}</Button>
      {plan && (
        <>
          <EditableMarkdown value={plan} onChange={setPlan} label="Разработка на урока (редактируема)" />
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><ThemePicker themeId={themeId} setThemeId={setThemeId} /></div>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(plan); toast.success("Копирано"); }}><Copy /> Копирай</Button>
            <Button onClick={save} disabled={!themeId}><Save /> Запази към темата</Button>
          </div>
        </>
      )}
    </Card>
  );
}

const PEDAGOGY_KINDS = [
  { value: "worksheet", label: "Работен лист (за принтиране)" },
  { value: "discussion", label: "Дискусионни въпроси" },
  { value: "case_study", label: "Казус (case study)" },
  { value: "project", label: "Проектно задание" },
  { value: "quick_quiz", label: "Бърз тест (вх./изх. контрол)" },
] as const;

function PedagogyGen() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<typeof PEDAGOGY_KINDS[number]["value"]>("worksheet");
  const [grade, setGrade] = useState("");
  const [duration, setDuration] = useState(45);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [genTitle, setGenTitle] = useState("");
  const [themeId, setThemeId] = useState("");

  const gen = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-pedagogy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, kind, grade, duration, context }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setText(j.text); setGenTitle(j.title);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!themeId || !text) return;
    const label = PEDAGOGY_KINDS.find((k) => k.value === kind)?.label ?? "";
    const { error } = await supabase.from("resources").insert({
      theme_id: themeId, type: "lesson_plan", title: genTitle || `${label}: ${topic}`,
      description: `${label}${grade ? ` · ${grade}` : ""}`,
      content: { text, kind } as any, order_index: 999,
    });
    if (error) return toast.error(error.message);
    toast.success("Запазено като ресурс");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Вид материал</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PEDAGOGY_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Тема</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. Фотосинтеза" /></div>
        <div><Label>Клас</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="напр. 7А" /></div>
        <div><Label>Минути</Label><Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value || 45)} /></div>
        <div className="md:col-span-2"><Label>Допълнителен контекст (по желание)</Label>
          <Textarea rows={2} value={context} onChange={(e) => setContext(e.target.value)} placeholder="специфики на класа, цели, предходни знания..." /></div>
      </div>
      <Button onClick={gen} disabled={loading || !topic.trim()}><Sparkles /> {loading ? "Генериране..." : "Генерирай"}</Button>
      {text && (
        <>
          <EditableMarkdown value={text} onChange={setText} label={`${genTitle || "Материал"} (редактируем)`} />
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><ThemePicker themeId={themeId} setThemeId={setThemeId} /></div>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Копирано"); }}><Copy /> Копирай</Button>
            <Button onClick={save} disabled={!themeId}><Save /> Запази към темата</Button>
          </div>
        </>
      )}
    </Card>
  );
}

function CodeGen() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("csharp");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [loading, setLoading] = useState(false);
  const [ex, setEx] = useState<any>(null);
  const [themeId, setThemeId] = useState("");

  const gen = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-code-exercise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, language, level }) });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setEx(j.exercise);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!themeId || !ex) return;
    const { error } = await supabase.from("resources").insert({
      theme_id: themeId, type: "code_exercise",
      title: ex.title || topic, description: `${language} · ${level}`,
      content: ex as any, order_index: 999,
    });
    if (error) return toast.error(error.message);
    toast.success("Упражнението е запазено");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_160px_auto] gap-3 items-end">
        <div><Label>Тема</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. Сортиране на масив" /></div>
        <div><Label>Език</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          {["csharp", "html", "css", "sql", "javascript", "python"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
        </SelectContent></Select></div>
        <div><Label>Ниво</Label><Select value={level} onValueChange={(v) => setLevel(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="beginner">Начинаещ</SelectItem>
          <SelectItem value="intermediate">Среден</SelectItem>
          <SelectItem value="advanced">Напреднал</SelectItem>
        </SelectContent></Select></div>
        <Button onClick={gen} disabled={loading || !topic.trim()}><Sparkles /> {loading ? "..." : "Генерирай"}</Button>
      </div>
      {ex && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{ex.title}</h3>
          <Section title="Условие"><p className="text-sm whitespace-pre-wrap">{ex.statement}</p></Section>
          {ex.hints && <Section title="Насоки"><p className="text-sm whitespace-pre-wrap text-muted-foreground">{ex.hints}</p></Section>}
          {ex.starter_code && <Section title="Стартов код"><pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{ex.starter_code}</code></pre></Section>}
          <Section title="Решение"><pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{ex.solution}</code></pre></Section>
          {(ex.test_cases?.length ?? 0) > 0 && (
            <Section title="Тестови случаи">
              <div className="space-y-1 text-xs font-mono">{ex.test_cases.map((tc: any, i: number) => (
                <div key={i} className="rounded bg-muted p-2">→ in: {tc.input} | expect: {tc.expected}</div>
              ))}</div>
            </Section>
          )}
          <div className="flex gap-2 items-end border-t pt-3">
            <div className="flex-1"><ThemePicker themeId={themeId} setThemeId={setThemeId} /></div>
            <Button onClick={save} disabled={!themeId}><Save /> Запази</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      {children}
    </div>
  );
}

function EditableMarkdown({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground truncate">{label ?? "Съдържание"}</div>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "preview" ? "default" : "ghost"} onClick={() => setMode("preview")}><Eye className="h-3.5 w-3.5" /> Преглед</Button>
          <Button size="sm" variant={mode === "edit" ? "default" : "ghost"} onClick={() => setMode("edit")}><Pencil className="h-3.5 w-3.5" /> Редакция</Button>
        </div>
      </div>
      {mode === "preview" ? (
        <div className="p-4 max-h-[60vh] overflow-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{value}</ReactMarkdown></div>
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs min-h-[60vh] rounded-none border-0 focus-visible:ring-0"
        />
      )}
    </Card>
  );
}
