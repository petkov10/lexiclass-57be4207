import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { ChevronRight, ListTree } from "lucide-react";

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

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : themes && themes.length > 0 ? (
          <div className="space-y-2">
            {themes.map((t, i) => (
              <Link
                key={t.id}
                to="/theme/$themeId"
                params={{ themeId: t.id }}
                className="hover-lift group flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center text-sm font-medium">
                  {t.week_number ?? i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                </div>
                <ListTree className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Няма добавени теми за този предмет в този клас.</p>
        )}
      </div>
    </PublicShell>
  );
}
