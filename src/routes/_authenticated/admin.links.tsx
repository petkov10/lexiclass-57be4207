import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LinkIcon, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { aiFetch } from "@/lib/ai-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/links")({
  component: LinkChecker,
});

type Row = { id: string; title: string; url: string | null; theme_id: string | null };
type Result = { url: string; status: number; ok: boolean };

function LinkChecker() {
  const { data: rows } = useQuery({
    queryKey: ["resources-with-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, url, theme_id")
        .not("url", "is", null)
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);

  const external = (rows ?? []).filter((r) => r.url && /^https?:\/\//i.test(r.url));

  const check = async () => {
    if (!external.length) return;
    setRunning(true);
    try {
      const chunkSize = 20;
      const map: Record<string, Result> = {};
      for (let i = 0; i < external.length; i += chunkSize) {
        const urls = external.slice(i, i + chunkSize).map((r) => r.url!);
        const res = await aiFetch("/api/link-check", { urls });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { results: Result[] };
        data.results.forEach((r) => { map[r.url] = r; });
        setResults({ ...map });
      }
      const broken = Object.values(map).filter((r) => !r.ok).length;
      toast[broken ? "warning" : "success"](broken ? `${broken} счупени връзки` : "Всички връзки работят");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при проверката");
    } finally {
      setRunning(false);
    }
  };

  const checked = Object.keys(results).length;
  const broken = Object.values(results).filter((r) => !r.ok);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><LinkIcon className="h-6 w-6 text-primary" /> Проверка на връзките</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Проверява дали външните линкове в ресурсите още работят. Намерени: {external.length}.
          </p>
        </div>
        <Button onClick={check} disabled={running || external.length === 0}>
          {running ? "Проверявам…" : "Провери всички"}
        </Button>
      </div>

      {checked > 0 && (
        <Card className="p-4 flex gap-6 text-sm">
          <span>Проверени: <strong>{checked}</strong></span>
          <span className="text-emerald-600">Работят: <strong>{checked - broken.length}</strong></span>
          <span className="text-destructive">Проблемни: <strong>{broken.length}</strong></span>
        </Card>
      )}

      <div className="space-y-2">
        {external.map((r) => {
          const res = r.url ? results[r.url] : undefined;
          return (
            <div key={r.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="shrink-0">
                {!res ? <span className="text-xs text-muted-foreground">—</span>
                  : res.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <XCircle className="h-5 w-5 text-destructive" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.url}</div>
              </div>
              {res && !res.ok && <span className="text-xs text-destructive shrink-0">{res.status || "няма връзка"}</span>}
              {r.theme_id && (
                <Button asChild size="sm" variant="ghost">
                  <Link to="/theme/$themeId" params={{ themeId: r.theme_id }} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                </Button>
              )}
            </div>
          );
        })}
        {external.length === 0 && <p className="text-sm text-muted-foreground">Няма ресурси с външни връзки.</p>}
      </div>
    </div>
  );
}
