import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fileUrl, resourcesForThemeQuery, themeByIdQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { ChevronRight, FileText, Link as LinkIcon, Video, FileCheck, Code, Image as ImgIcon, StickyNote, Presentation, Pencil, ExternalLink, BookOpen, Layers, RotateCw } from "lucide-react";
import type { ResourceRow, ResourceType, Flashcard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/theme/$themeId")({
  component: ThemePage,
});

const ICONS: Record<ResourceType, typeof FileText> = {
  presentation: Presentation,
  document: FileText,
  link: LinkIcon,
  video: Video,
  test: FileCheck,
  task: Pencil,
  code: Code,
  image: ImgIcon,
  note: StickyNote,
  notebooklm: BookOpen,
  flashcards: Layers,
  other: FileText,
};
const LABELS: Record<ResourceType, string> = {
  presentation: "Презентация",
  document: "Документ",
  link: "Линк",
  video: "Видео",
  test: "Тест",
  task: "Задача",
  code: "Код",
  image: "Изображение",
  note: "Бележка",
  notebooklm: "NotebookLM",
  flashcards: "Флаш карти",
  other: "Друго",
};

function ThemePage() {
  const { themeId } = Route.useParams();
  const { data: theme } = useQuery(themeByIdQuery(themeId));
  const { data: resources, isLoading } = useQuery(resourcesForThemeQuery(themeId));
  const [open, setOpen] = useState<ResourceRow | null>(null);

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Link to="/" className="hover:text-foreground">Класове</Link>
          {theme?.class_id && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/class/$classId" params={{ classId: theme.class_id }} className="hover:text-foreground">
                {(theme as any)?.class?.name}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/class/$classId/subject/$subjectId" params={{ classId: theme.class_id, subjectId: theme.subject_id }} className="hover:text-foreground">
                {(theme as any)?.subject?.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{theme?.name}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{theme?.name}</h1>
        {theme?.description && <p className="mt-2 text-muted-foreground">{theme.description}</p>}

        <div className="mt-8 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
          ) : resources && resources.length > 0 ? (
            resources.map((r) => (
              <ResourceCard key={r.id} r={r as ResourceRow} onOpen={() => setOpen(r as ResourceRow)} />
            ))
          ) : (
            <p className="text-muted-foreground">Все още няма ресурси за тази тема.</p>
          )}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.title}</DialogTitle></DialogHeader>
              <ResourceViewer r={open} />
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

  return (
    <div className="hover-lift group flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{r.title}</div>
        <div className="text-xs text-muted-foreground">
          {LABELS[r.type]} {r.description ? `· ${r.description}` : ""}
        </div>
      </div>
      {isExternal && url ? (
        <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">Отвори <ExternalLink /></a></Button>
      ) : (r.type === "task" || r.type === "code" || r.type === "note" || r.type === "flashcards") ? (
        <Button onClick={onOpen} variant="outline" size="sm">Преглед</Button>
      ) : url ? (
        <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">Отвори <ExternalLink /></a></Button>
      ) : (
        <Button onClick={onOpen} variant="outline" size="sm">Преглед</Button>
      )}
    </div>
  );
}

function ResourceViewer({ r }: { r: ResourceRow }) {
  const url = r.url || fileUrl(r.file_path);
  if (r.type === "task") {
    const c = (r.content ?? {}) as Record<string, string>;
    return (
      <div className="space-y-4 text-sm">
        {r.description && <p className="text-muted-foreground">{r.description}</p>}
        {c.statement && <Section title="Условие"><Markdown text={c.statement} /></Section>}
        {c.hints && <Section title="Насоки за решаване"><Markdown text={c.hints} /></Section>}
        {(c.sample_input || c.sample_output) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {c.sample_input && <Section title="Примерен вход"><pre className="bg-muted rounded p-3 text-xs overflow-auto">{c.sample_input}</pre></Section>}
            {c.sample_output && <Section title="Примерен изход"><pre className="bg-muted rounded p-3 text-xs overflow-auto">{c.sample_output}</pre></Section>}
          </div>
        )}
        {c.solution && <Section title={`Решение${c.language ? ` (${c.language})` : ""}`}><pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.solution}</code></pre></Section>}
      </div>
    );
  }
  if (r.type === "code") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <pre className="bg-muted rounded p-3 text-xs overflow-auto"><code>{c.code || ""}</code></pre>;
  }
  if (r.type === "note") {
    const c = (r.content ?? {}) as Record<string, string>;
    return <div className="prose prose-sm max-w-none"><Markdown text={c.text || r.description || ""} /></div>;
  }
  if (r.type === "flashcards") {
    const cards = (((r.content ?? {}) as { flashcards?: Flashcard[] }).flashcards ?? []).filter((c) => c?.front);
    return <FlashcardsViewer cards={cards} />;
  }
  if (url) {
    return (
      <div className="space-y-3">
        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
        <iframe src={url} className="w-full h-[70vh] rounded border" />
      </div>
    );
  }
  return <p>Няма съдържание.</p>;
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
