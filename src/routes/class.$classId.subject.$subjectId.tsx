import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { ChevronRight, ListTree } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/class/$classId/subject/$subjectId")({
  component: SubjectPage,
});

function SubjectPage() {
  const { classId, subjectId } = Route.useParams();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes, isLoading } = useQuery(themesQuery(classId, subjectId));
  const cls = classes?.find((c) => c.id === classId);
  const subj = subjects?.find((s) => s.id === subjectId);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (themes ?? []).forEach((t: any) => (t.tags ?? []).forEach((tag: string) => set.add(tag)));
    return Array.from(set).sort();
  }, [themes]);

  const filtered = useMemo(() => {
    if (!themes) return [];
    if (!activeTag) return themes;
    return themes.filter((t: any) => (t.tags ?? []).includes(activeTag));
  }, [themes, activeTag]);

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Link to="/" className="hover:text-foreground">Класове</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/class/$classId" params={{ classId }} className="hover:text-foreground">{cls?.name}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{subj?.name}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Теми</h1>

        {allTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-xs rounded-full px-3 py-1 border transition ${activeTag === null ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
            >
              Всички
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`text-xs rounded-full px-3 py-1 border transition ${activeTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((t: any, i: number) => (
              <Link
                key={t.id}
                to="/theme/$themeId"
                params={{ themeId: t.id }}
                className="hover-lift group flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
                style={t.color ? { borderLeft: `4px solid ${t.color}` } : undefined}
              >
                <div
                  className="h-9 w-9 rounded-md grid place-items-center text-sm font-medium shrink-0"
                  style={t.color
                    ? { background: `${t.color}22`, color: t.color }
                    : undefined}
                >
                  <span className={t.color ? "" : "text-primary"} style={t.color ? undefined : { background: undefined }}>
                    {t.week_number ?? i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                  {(t.tags?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] rounded-full bg-muted px-2 py-0.5">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <ListTree className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Няма теми {activeTag ? `с таг „${activeTag}"` : "за този предмет в този клас"}.</p>
        )}
      </div>
    </PublicShell>
  );
}
