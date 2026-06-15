import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fileUrl, resourcesForThemeQuery, themeByIdQuery, homeworkForThemeQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { ChevronRight, FileText, Link as LinkIcon, Video, FileCheck, Code, Image as ImgIcon, StickyNote, Presentation, Pencil, ExternalLink, BookOpen, Layers, RotateCw, Maximize2, Minimize2, ClipboardList, ChevronLeft, BookCheck } from "lucide-react";
import type { ResourceRow, ResourceType, Flashcard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/theme/$themeId")({
  component: ThemePage,
});

const ICONS: Record<ResourceType, typeof FileText> = {
  presentation: Presentation, document: FileText, link: LinkIcon, video: Video,
  test: FileCheck, task: Pencil, code: Code, image: ImgIcon, note: StickyNote,
  notebooklm: BookOpen, flashcards: Layers, lesson_plan: BookOpen, code_exercise: Code, other: FileText,
};
const LABELS: Record<ResourceType, string> = {
  presentation: "Презентация", document: "Документ", link: "Линк", video: "Видео",
  test: "Тест", task: "Задача", code: "Код", image: "Изображение", note: "Бележка",
  notebooklm: "NotebookLM", flashcards: "Флаш карти", lesson_plan: "Педагогически материал", code_exercise: "Код упражнение", other: "Друго",
};

function ThemePage() {
  const { themeId } = Route.useParams();
  const { data: theme } = useQuery(themeByIdQuery(themeId));
  const { data: resources, isLoading } = useQuery(resourcesForThemeQuery(themeId));
  const { data: homework } = useQuery(homeworkForThemeQuery(themeId));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Save last visited theme
  useEffect(() => {
    if (theme) {
      localStorage.setItem("lexiclass:last-theme", JSON.stringify({
        themeId, themeName: theme.name, classId: theme.class_id, subjectId: theme.subject_id, at: Date.now(),
      }));
    }
  }, [theme, themeId]);

  // Keyboard navigation in fullscreen viewer
  useEffect(() => {
    if (openIdx === null || !resources) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFullscreen(false); setOpenIdx(null); }
      if (e.key === "ArrowRight") setOpenIdx((i) => i === null ? null : Math.min(i + 1, resources.length - 1));
      if (e.key === "ArrowLeft") setOpenIdx((i) => i === null ? null : Math.max(i - 1, 0));
      if (e.key === "f" || e.key === "F") setFullscreen((f) => !f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openIdx, resources]);

  const open = openIdx !== null && resources ? (resources[openIdx] as ResourceRow) : null;

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Link to="/" className="hover:text-foreground">Класове</Link>
          {theme?.class_id && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/class/$classId" params={{ classId: theme.class_id }} className="hover:text-foreground">{(theme as any)?.class?.name}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/class/$classId/subject/$subjectId" params={{ classId: theme.class_id, subjectId: theme.subject_id }} className="hover:text-foreground">{(theme as any)?.subject?.name}</Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{theme?.name}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{theme?.name}</h1>
        {theme?.description && <p className="mt-2 text-muted-foreground">{theme.description}</p>}

        <div className="mt-8 space-y-8">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : resources && resources.length > 0 ? (
            <ResourceGroups resources={resources as ResourceRow[]} onOpen={(i) => setOpenIdx(i)} />
          ) : (
            <p className="text-muted-foreground">Все още няма ресурси за тази тема.</p>
          )}
        </div>

        {(homework?.length ?? 0) > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><BookCheck className="h-5 w-5 text-primary" /> Домашна работа</h2>
            <div className="space-y-2">
              {homework!.map((h) => (
                <div key={h.id} className="rounded-lg border bg-card p-4">
                  <div className="font-medium">{h.title}</div>
                  {h.description && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{h.description}</div>}
                  {h.deadline && <div className="text-xs text-primary mt-2">Срок: {new Date(h.deadline).toLocaleDateString("bg-BG")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={openIdx !== null} onOpenChange={(v) => { if (!v) { setOpenIdx(null); setFullscreen(false); } }}>
        <DialogContent className={fullscreen ? "max-w-[100vw] w-screen h-screen max-h-screen rounded-none p-4" : "max-w-4xl max-h-[90vh] overflow-auto"}>
          {open && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="truncate">{open.title}</DialogTitle>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setOpenIdx((i) => i !== null && i > 0 ? i - 1 : i)} disabled={openIdx === 0}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-xs text-muted-foreground">{(openIdx ?? 0) + 1}/{resources?.length}</span>
                    <Button size="sm" variant="ghost" onClick={() => setOpenIdx((i) => i !== null && resources && i < resources.length - 1 ? i + 1 : i)} disabled={!resources || openIdx === resources.length - 1}><ChevronRight className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setFullscreen((f) => !f)} title="F">{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
                  </div>
                </div>
              </DialogHeader>
              <div className={fullscreen ? "flex-1 overflow-auto" : ""}>
                <ResourceViewer r={open} fullscreen={fullscreen} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PublicShell>
  );
}

function ResourceCard({ r, onOpen }: { r: ResourceRow; onOpen: () => void }) {
  const Icon = ICONS[r.type] ?? FileText;
  const isExternal = r.type === "link" || r.type === "video" || r.type === "notebooklm";
  const url = r.url || fileUrl(r.file_path);
  const isTest = r.type === "test";
  return (
    <div className="hover-lift group flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{r.title}</div>
        <div className="text-xs text-muted-foreground">{LABELS[r.type]} {r.description ? `· ${r.description}` : ""}</div>
      </div>
      {isTest ? (
        <Button asChild size="sm"><a href={`/test/${r.id}`}>Започни теста</a></Button>
      ) : isExternal && url ? (
        <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">Отвори <ExternalLink /></a></Button>
      ) : (
        <Button onClick={onOpen} variant="outline" size="sm">Преглед</Button>
      )}
    </div>
  );
}

function ResourceViewer({ r, fullscreen }: { r: ResourceRow; fullscreen: boolean }) {
  const url = r.url || fileUrl(r.file_path);
  if (r.type === "task" || r.type === "code_exercise") {
    const c = (r.content ?? {}) as Record<string, any>;
    return (
      <div className="space-y-4 text-sm">
        {r.description && <p className="text-muted-foreground">{r.description}</p>}
        {c.statement && <Section title="Условие"><Markdown text={c.statement} /></Section>}
        {c.hints && <Section title="Насоки"><Markdown text={c.hints} /></Section>}
        {(c.sample_input || c.sample_output) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {c.sample_input && <Section title="Примерен вход"><pre className="bg-muted rounded p-3 text-xs overflow-auto">{c.sample_input}</pre></Section>}
            {c.sample_output && <Section title="Примерен изход"><pre className="bg-muted rounded p-3 text-xs overflow-auto">{c.sample_output}</pre></Section>}
          </div>
        )}
        {c.starter_code && <Section title="Стартов код"><pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.starter_code}</code></pre></Section>}
        {c.solution && <Section title={`Решение${c.language ? ` (${c.language})` : ""}`}><pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.solution}</code></pre></Section>}
        {Array.isArray(c.test_cases) && c.test_cases.length > 0 && (
          <Section title="Тестови случаи">
            <div className="space-y-1 text-xs font-mono">{c.test_cases.map((tc: any, i: number) => (
              <div key={i} className="rounded bg-muted p-2">in: {tc.input} → expect: {tc.expected}</div>
            ))}</div>
          </Section>
        )}
      </div>
    );
  }
  if (r.type === "test") {
    return <TestViewer content={r.content as any} />;
  }
  if (r.type === "lesson_plan") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{c.text || r.description || ""}</ReactMarkdown></div>;
  }
  if (r.type === "code") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.code || ""}</code></pre>;
  }
  if (r.type === "note") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{c.text || r.description || ""}</ReactMarkdown></div>;
  }
  if (r.type === "flashcards") {
    const cards = (((r.content ?? {}) as { flashcards?: Flashcard[] }).flashcards ?? []).filter((c) => c?.front);
    return <FlashcardsViewer cards={cards} fullscreen={fullscreen} />;
  }
  if (url) {
    return (
      <div className="space-y-3 h-full">
        {r.description && !fullscreen && <p className="text-sm text-muted-foreground">{r.description}</p>}
        <iframe src={url} className={fullscreen ? "w-full h-[calc(100vh-7rem)] rounded border" : "w-full h-[70vh] rounded border"} />
      </div>
    );
  }
  return <p>Няма съдържание.</p>;
}

function TestViewer({ content }: { content: any }) {
  const [showAnswers, setShowAnswers] = useState(false);
  if (!content?.questions) return <p>Тестът е празен.</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {content.title}</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAnswers((s) => !s)}>{showAnswers ? "Скрий отговорите" : "Покажи отговорите"}</Button>
      </div>
      <ol className="space-y-4 list-decimal pl-5">
        {content.questions.map((q: any, i: number) => (
          <li key={i} className="space-y-1">
            <div className="font-medium">{q.q}</div>
            {q.type === "mc" && (
              <ul className="text-sm space-y-0.5">{(q.options ?? []).map((o: string, j: number) => (
                <li key={j} className={showAnswers && o === q.answer ? "text-primary font-medium" : ""}>○ {o}</li>
              ))}</ul>
            )}
            {showAnswers && <div className="text-xs text-muted-foreground"><strong>Отговор:</strong> {q.answer}{q.explanation ? ` — ${q.explanation}` : ""}</div>}
          </li>
        ))}
      </ol>
    </div>
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

function Markdown({ text }: { text: string }) {
  return <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{text}</ReactMarkdown></div>;
}

function FlashcardsViewer({ cards, fullscreen }: { cards: Flashcard[]; fullscreen?: boolean }) {
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => { setOrder(cards.map((_, i) => i)); setIdx(0); setFlipped(false); }, [cards]);

  const go = (d: number) => { setFlipped(false); setIdx((i) => (i + d + cards.length) % cards.length); };
  const shuffle = () => {
    const a = [...order];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    setOrder(a); setIdx(0); setFlipped(false);
  };

  useEffect(() => {
    if (!autoplay || cards.length === 0) return;
    const t = setInterval(() => {
      setFlipped((f) => {
        if (!f) return true;
        setIdx((i) => (i + 1) % cards.length);
        return false;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [autoplay, cards.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key.toLowerCase() === "s") shuffle();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cards.length, order]);

  if (cards.length === 0) return <p className="text-sm text-muted-foreground">Няма карти.</p>;
  const card = cards[order[Math.min(idx, order.length - 1)]];
  const minH = fullscreen ? "min-h-[calc(100vh-14rem)]" : "min-h-[260px]";
  const fontCls = fullscreen
    ? "font-semibold whitespace-pre-wrap leading-tight [font-size:clamp(2rem,6vw,5.5rem)]"
    : "text-xl md:text-2xl font-medium whitespace-pre-wrap";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">{idx + 1} / {cards.length}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={shuffle} title="S — разбърквай">Разбъркай</Button>
          <Button size="sm" variant={autoplay ? "default" : "outline"} onClick={() => setAutoplay((a) => !a)}>
            {autoplay ? "■ Спри" : "▶ Авто"}
          </Button>
        </div>
      </div>
      <button onClick={() => setFlipped((f) => !f)} className={`w-full ${minH} rounded-2xl border-2 border-primary/30 bg-card hover:bg-accent/40 p-8 md:p-12 grid place-items-center text-center transition-all`}>
        <div className="max-w-full">
          <div className="text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-4">{flipped ? "Отговор" : "Въпрос"}</div>
          <div className={fontCls}>{flipped ? card.back : card.front}</div>
          {!fullscreen && <div className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1"><RotateCw className="h-3 w-3" /> Кликни / Space за обръщане</div>}
        </div>
      </button>
      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => go(-1)} size={fullscreen ? "lg" : "default"}>← Предишна</Button>
        <Button variant="outline" onClick={() => go(1)} size={fullscreen ? "lg" : "default"}>Следваща →</Button>
      </div>
    </div>
  );
}
