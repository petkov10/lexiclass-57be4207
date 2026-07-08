import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { activityLogQuery } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityPage,
});

const ACTION_LABELS: Record<string, string> = {
  "class.create": "Създаде клас",
  "class.update": "Промени клас",
  "class.delete": "Изтри клас",
  "subject.create": "Създаде предмет",
  "subject.update": "Промени предмет",
  "subject.delete": "Изтри предмет",
  "theme.create": "Създаде тема",
  "theme.update": "Промени тема",
  "theme.delete": "Изтри тема",
  "resource.create": "Добави ресурс",
  "resource.update": "Промени ресурс",
  "resource.delete": "Изтри ресурс",
  "schedule.create": "Добави час",
  "schedule.update": "Премести час",
  "schedule.delete": "Изтри час",
  "settings.update": "Промени настройки",
  "user.approve": "Одобри потребител",
  "user.pause": "Спря потребител",
};

function ActivityPage() {
  const { data: logs, isLoading } = useQuery(activityLogQuery(300));
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return logs ?? [];
    return (logs ?? []).filter((l) =>
      [l.actor_name, l.action, l.entity_type, l.entity_label]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [logs, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Дневник на действията
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Кой какво е правил в администрацията. Записите се пазят автоматично.
        </p>
      </div>

      <Input placeholder="Търси по потребител, действие или ресурс…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      <Card>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Зареждане…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Няма записи.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((l) => (
              <div key={l.id} className="p-3 md:p-4 grid gap-1 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{l.actor_name ?? "—"}</span>{" "}
                    <span className="text-muted-foreground">{ACTION_LABELS[l.action] ?? l.action}</span>
                    {l.entity_label && <> · <span className="font-medium truncate">{l.entity_label}</span></>}
                  </div>
                  {l.entity_type && (
                    <div className="text-xs text-muted-foreground">{l.entity_type}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ""}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground md:text-right">
                  {new Date(l.created_at).toLocaleString("bg-BG")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
