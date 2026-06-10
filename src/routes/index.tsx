import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, settingsQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: classes, isLoading } = useQuery(classesQuery);
  const { data: settings } = useQuery(settingsQuery);

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Добре дошли в {settings?.site_name || "EduHub"}
          </h1>
          <p className="mt-3 text-muted-foreground">Изберете клас, за да продължите.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : classes && classes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to="/class/$classId"
                params={{ classId: c.id }}
                className="hover-lift group rounded-xl border bg-card p-5 flex flex-col items-start gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="font-medium tracking-tight">{c.name}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            Все още няма добавени класове. Влезте като администратор, за да започнете.
          </div>
        )}
      </div>
    </PublicShell>
  );
}
