import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { resourcesForThemeQuery, themeByIdQuery, homeworkForThemeQuery } from "@/lib/queries";
import { useResourceUrl } from "@/hooks/useResourceUrl";
import { PublicShell } from "@/components/layout/PublicShell";
import { ChevronRight, FileText, Link as LinkIcon, Video, FileCheck, Code, Image as ImgIcon, StickyNote, Presentation, Pencil, ExternalLink, BookOpen, Layers, RotateCw, Maximize2, Minimize2, ClipboardList, ChevronLeft, BookCheck, Download } from "lucide-react";
import type { ResourceRow, ResourceType, Flashcard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Markdown } from "@/components/Markdown";
import { QrCodeButton } from "@/components/QrCodeButton";
import { ThemeAIChat } from "@/components/ThemeAIChat";
import { Share2, Star, MonitorPlay } from "lucide-react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { getProjector, setProjector } from "@/lib/a11y";
import { toast } from "sonner";

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
  const [fav, setFav] = useState(false);
  const [projector, setProj] = useState(false);

  useEffect(() => {
    setFav(isFavorite(themeId));
    setProj(getProjector());
  }, [themeId]);

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

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{theme?.name}</h1>
            {theme?.description && <p className="mt-2 text-muted-foreground">{theme.description}</p>}
          </div>
          {typeof window !== "undefined" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const url = `${window.location.origin}/theme/${themeId}`;
                  try {
                    if (navigator.share) await navigator.share({ title: theme?.name, url });
                    else { await navigator.clipboard.writeText(url); toast.success("Линкът е копиран"); }
                  } catch { /* cancelled */ }
                }}
              >
                <Share2 className="h-4 w-4" /> Копирай линк
              </Button>
              <QrCodeButton
                url={`${window.location.origin}/theme/${themeId}`}
                label="QR"
                title={`QR за темата: ${theme?.name ?? ""}`}
              />
            </div>
          )}
        </div>

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
      {theme && (
        <ThemeAIChat
          themeName={theme.name}
          themeDescription={theme.description}
          resources={(resources ?? []) as ResourceRow[]}
        />
      )}
    </PublicShell>
  );
}

const GROUP_ORDER: { types: ResourceType[]; label: string }[] = [
  { types: ["presentation"], label: "Презентации" },
  { types: ["document"], label: "Документи" },
  { types: ["video"], label: "Видео" },
  { types: ["notebooklm"], label: "NotebookLM" },
  { types: ["lesson_plan", "note"], label: "Материали и бележки" },
  { types: ["flashcards"], label: "Флаш карти" },
  { types: ["test"], label: "Тестове" },
  { types: ["task", "code_exercise", "code"], label: "Задачи и код" },
  { types: ["link"], label: "Връзки" },
  { types: ["image"], label: "Изображения" },
  { types: ["other"], label: "Други" },
];

function ResourceGroups({ resources, onOpen }: { resources: ResourceRow[]; onOpen: (i: number) => void }) {
  const indexMap = new Map(resources.map((r, i) => [r.id, i]));
  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((g) => {
        const items = resources.filter((r) => g.types.includes(r.type));
        if (items.length === 0) return null;
        return (
          <section key={g.label}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
              <span className="text-xs text-muted-foreground">· {items.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((r) => (
                <ResourceCard key={r.id} r={r} onOpen={() => onOpen(indexMap.get(r.id)!)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ResourceCard({ r, onOpen }: { r: ResourceRow; onOpen: () => void }) {
  const Icon = ICONS[r.type] ?? FileText;
  const isExternal = r.type === "link" || r.type === "video" || r.type === "notebooklm";
  const { url, loading } = useResourceUrl({ url: r.url, file_path: r.file_path });
  const isTest = r.type === "test";
  return (
    <div className="hover-lift group flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"><Icon className="h-5 w-5" /></div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{r.title}</div>
        {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
      </div>
      {isTest ? (
        <Button asChild size="sm"><a href={`/test/${r.id}`}>Започни</a></Button>
      ) : isExternal && url ? (
        <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">Отвори <ExternalLink /></a></Button>
      ) : (
        <Button onClick={onOpen} variant="outline" size="sm" disabled={loading && !!r.file_path && !r.url}>
          {loading && !!r.file_path && !r.url ? "..." : "Преглед"}
        </Button>
      )}
    </div>
  );
}

function ResourceViewer({ r, fullscreen }: { r: ResourceRow; fullscreen: boolean }) {
  const { url, loading, error } = useResourceUrl({ url: r.url, file_path: r.file_path });
  if (r.type === "task" || r.type === "code_exercise") {
    const c = (r.content ?? {}) as Record<string, any>;
    return (
      <div className="space-y-4 text-sm">
        {r.description && <p className="text-muted-foreground">{r.description}</p>}
        {c.statement && <Section title="Условие"><div className="prose prose-sm max-w-none dark:prose-invert"><Markdown>{c.statement}</Markdown></div></Section>}
        {c.hints && <Section title="Насоки"><div className="prose prose-sm max-w-none dark:prose-invert"><Markdown>{c.hints}</Markdown></div></Section>}
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
    return <TestViewer resourceId={r.id} title={r.title} />;
  }

  if (r.type === "lesson_plan") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <div className="prose prose-sm max-w-none dark:prose-invert"><Markdown>{c.text || r.description || ""}</Markdown></div>;
  }
  if (r.type === "code") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.code || ""}</code></pre>;
  }
  if (r.type === "note") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <div className="prose prose-sm max-w-none dark:prose-invert"><Markdown>{c.text || r.description || ""}</Markdown></div>;
  }
  if (r.type === "flashcards") {
    const cards = (((r.content ?? {}) as { flashcards?: Flashcard[] }).flashcards ?? []).filter((c) => c?.front);
    return <FlashcardsViewer cards={cards} fullscreen={fullscreen} />;
  }
  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Зареждане на файла…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-destructive">Грешка при достъп до файла. Опитай да опресниш страницата или качи ресурса отново.</div>;
  }
  if (url) {
    return <FilePreview url={url} fileName={r.file_path ?? r.title} description={r.description} fullscreen={fullscreen} />;
  }
  return <p className="p-4 text-sm text-muted-foreground">Няма съдържание за преглед.</p>;
}

function FilePreview({ url, fileName, description, fullscreen }: { url: string; fileName?: string | null; description?: string | null; fullscreen: boolean }) {
  const ext = (fileName?.split(".").pop() ?? "").toLowerCase().split("?")[0];
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "webm", "mov", "m4v", "ogv"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext);
  const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"].includes(ext);
  const isText = ["txt", "md", "csv", "json", "log", "xml", "html", "css", "js", "ts", "tsx", "jsx", "py", "java", "cpp", "c", "cs", "rb", "go", "rs", "php", "sql", "yml", "yaml"].includes(ext);

  const frameCls = fullscreen ? "w-full h-[calc(100vh-9rem)] rounded border" : "w-full h-[70vh] rounded border";
  const shortName = fileName?.split("/").pop() ?? fileName ?? "";

  const bar = (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="truncate">{shortName}</span>
      <div className="flex items-center gap-2 shrink-0">
        <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">Нов таб</a>
        <a href={url} download={shortName || true} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
          <Download className="h-3.5 w-3.5" /> Свали
        </a>
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (isImage) {
    body = <div className={`${frameCls} overflow-auto bg-muted/30 grid place-items-center`}><img src={url} alt={shortName} className="max-w-full max-h-full object-contain" /></div>;
  } else if (isVideo) {
    body = <video src={url} controls className={frameCls} />;
  } else if (isAudio) {
    body = <div className={`${frameCls} grid place-items-center bg-muted/30 p-6`}><audio src={url} controls className="w-full max-w-xl" /></div>;
  } else if (isOffice) {
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    body = <iframe src={viewer} className={frameCls} title={shortName} />;
  } else if (isPdf || isText || !ext) {
    body = <iframe src={url} className={frameCls} title={shortName} />;
  } else {
    body = (
      <div className={`${frameCls} grid place-items-center bg-muted/30 text-center p-6`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Този тип файл не може да се визуализира директно в браузъра.</p>
          <a href={url} download={shortName || true} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
            <Download className="h-4 w-4" /> Свали файла
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full">
      {description && !fullscreen && <p className="text-sm text-muted-foreground">{description}</p>}
      {body}
      {bar}
    </div>
  );
}

function TestViewer({ resourceId, title }: { resourceId: string; title: string }) {
  // Questions and answer keys are never embedded here — the test runner fetches
  // an answer-free payload from the server and grading happens server-side.
  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {title}</h3>
      <p className="text-sm text-muted-foreground">
        Отвори теста, за да го решиш. Резултатът се изчислява автоматично след предаване.
      </p>
      <Button asChild size="sm">
        <a href={`/test/${resourceId}`}>Започни теста</a>
      </Button>
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
