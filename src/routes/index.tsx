import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, settingsQuery, mySchedulesQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { GraduationCap, Clock, ArrowRight, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const DAY_NAMES = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

type LastVisit = { themeId: string; themeName: string; classId: string; subjectId: string; at: number };

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: classes, isLoading } = useQuery(classesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { user } = useAuth();
  const { data: schedule } = useQuery(mySchedulesQuery(user?.id));
  const [last, setLast] = useState<LastVisit | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("izvor:last-theme");
      if (raw) setLast(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  const today = new Date().getDay();
  const todayItems = (schedule ?? []).filter((s: any) => s.day_of_week === today);

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Добре дошли в {settings?.site_name || "Izvor"}
          </h1>
          <p className="mt-3 text-muted-foreground">Изберете клас, за да продължите.</p>
        </div>

        {last && (
          <Link
            to="/theme/$themeId"
            params={{ themeId: last.themeId }}
            className="hover-lift block rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center"><History className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Продължи последния урок</div>
              <div className="font-medium truncate">{last.themeName}</div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </Link>
        )}

        {user && todayItems.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-medium">Днес ({DAY_NAMES[today]})</h2>
            </div>
            <div className="space-y-2">
              {todayItems.map((s: any) => (
                <Link
                  key={s.id}
                  to={s.theme_id ? "/theme/$themeId" : "/class/$classId/subject/$subjectId"}
                  params={s.theme_id ? { themeId: s.theme_id } : { classId: s.class_id, subjectId: s.subject_id }}
                  className="hover-lift flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="font-mono text-sm w-24 text-muted-foreground">{s.start_time.slice(0, 5)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.class?.name} · {s.subject?.name}</div>
                    {s.theme && <div className="text-xs text-muted-foreground truncate">→ {s.theme.name}</div>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : classes && classes.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Класове</h2>
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
