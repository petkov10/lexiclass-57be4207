import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, classSubjectsQuery, subjectsQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/class/$classId")({
  component: ClassPage,
});

function ClassPage() {
  const { classId } = Route.useParams();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);

  const cls = classes?.find((c) => c.id === classId);
  const subjectIds = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const items = subjects?.filter((s) => subjectIds.has(s.id)) ?? [];

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground">Класове</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{cls?.name ?? "..."}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Изберете предмет</h1>

        {items.length === 0 ? (
          <p className="text-muted-foreground">Няма предмети, назначени към този клас.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((s) => (
              <Link
                key={s.id}
                to="/class/$classId/subject/$subjectId"
                params={{ classId, subjectId: s.id }}
                className="hover-lift group rounded-xl border bg-card p-5 flex flex-col items-start gap-3"
              >
                <div
                  className="h-10 w-10 rounded-lg grid place-items-center text-white"
                  style={{ background: s.color }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="font-medium tracking-tight">{s.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
