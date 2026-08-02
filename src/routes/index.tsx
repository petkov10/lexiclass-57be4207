import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, settingsQuery, mySchedulesQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { GraduationCap, Clock, ArrowRight, History, Sparkles, Star, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { tintStyle } from "@/lib/colors";
import { SearchBar } from "@/components/SearchBar";
import { getFavorites, removeFavorite, type FavTheme } from "@/lib/favorites";

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
  const [favs, setFavs] = useState<FavTheme[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lexiclass:last-theme") || localStorage.getItem("izvor:last-theme");
      if (raw) setLast(JSON.parse(raw));
    } catch { /* */ }
    setFavs(getFavorites());
    const onChange = () => setFavs(getFavorites());
    window.addEventListener("lexiclass:favorites-changed", onChange);
    return () => window.removeEventListener("lexiclass:favorites-changed", onChange);
  }, []);


  const today = new Date().getDay();
  const todayItems = (schedule ?? []).filter((s: any) => s.day_of_week === today);
  const name = settings?.site_name || "LexiClass";

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative z-30">
        <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-8 text-center animate-float-in">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Учебни ресурси, тестове и AI — на едно място
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Добре дошли в <span className="gradient-text">{name}</span>
          </h1>
          <p className="mt-3 text-muted-foreground md:text-lg max-w-2xl mx-auto">
            Изберете клас или потърсете направо предмет или тема.
          </p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-14 space-y-8">
        {user && todayItems.length > 0 && (
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Днес — {DAY_NAMES[today]}</h2>
            </div>
            <div className="space-y-2">
              {todayItems.map((s: any) => (
                <Link
                  key={s.id}
                  to={s.theme_id ? "/theme/$themeId" : "/class/$classId/subject/$subjectId"}
                  params={s.theme_id ? { themeId: s.theme_id } : { classId: s.class_id, subjectId: s.subject_id }}
                  className="hover-lift flex items-center gap-3 rounded-xl border p-3"
                >
                  <div className="font-mono text-sm w-20 text-muted-foreground">{s.start_time.slice(0, 5)}</div>
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

        {/* Classes grid first */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : classes && classes.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Класове</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
              {classes.map((c, i) => (
                <Link
                  key={c.id}
                  to="/class/$classId"
                  params={{ classId: c.id }}
                  style={{ ...tintStyle(c.id), animationDelay: `${i * 30}ms` }}
                  className="tint-card hover-lift group rounded-xl border-2 p-3 flex flex-col items-start gap-2 animate-float-in"
                >
                  <div className="tint-icon h-8 w-8 rounded-lg grid place-items-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold tracking-tight leading-tight">{c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16 rounded-2xl border-2 border-dashed">
            Все още няма добавени класове. Влезте като администратор, за да започнете.
          </div>
        )}

        {/* Last visited — moved BELOW classes */}
        {last && (
          <Link
            to="/theme/$themeId"
            params={{ themeId: last.themeId }}
            className="hover-lift block rounded-2xl border-2 border-primary/30 gradient-soft p-4 animate-pop"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl gradient-bg text-primary-foreground grid place-items-center shadow-sm">
                <History className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Продължи последния урок</div>
                <div className="font-semibold truncate">{last.themeName}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </Link>
        )}
      </div>
    </PublicShell>
  );
}
