import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Download, Eye, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { classesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/grades")({
  component: GradesPage,
});

type Attempt = {
  id: string; resource_id: string; theme_id: string | null; class_id: string | null;
  student_name: string; student_number: string | null; student_class: string | null;
  answers: any; score: number; max_score: number; percent: number; grade: number | null;
  submitted_at: string; duration_seconds: number;
  resource?: { title: string; theme?: { name: string; subject?: { name: string } | null } | null } | null;
};

function GradesPage() {
  const { data: classes } = useQuery(classesQuery);
  const { data: attempts, refetch, isLoading } = useQuery({
    queryKey: ["test-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, resource:resources(title, theme:themes(name, subject:subjects(name)))")
        .order("submitted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Attempt[];
    },
  });

  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [view, setView] = useState<Attempt | null>(null);

  const resources = useMemo(() => {
    const m = new Map<string, string>();
    (attempts ?? []).forEach((a) => { if (a.resource?.title) m.set(a.resource_id, a.resource.title); });
    return Array.from(m, ([id, title]) => ({ id, title }));
  }, [attempts]);

  const filtered = (attempts ?? []).filter((a) => {
    if (classFilter !== "all" && a.class_id !== classFilter) return false;
    if (resourceFilter !== "all" && a.resource_id !== resourceFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!(`${a.student_name} ${a.student_number ?? ""} ${a.student_class ?? ""} ${a.resource?.title ?? ""}`).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const avg = filtered.length > 0 ? filtered.reduce((s, a) => s + (a.grade ?? 0), 0) / filtered.length : 0;

  const exportCsv = () => {
    const rows = [
      ["Дата", "Име", "№", "Клас", "Тест", "Предмет", "Точки", "Макс", "%", "Оценка", "Време (сек)"].join(","),
      ...filtered.map((a) => [
        new Date(a.submitted_at).toISOString(),
        csv(a.student_name), csv(a.student_number ?? ""), csv(a.student_class ?? ""),
        csv(a.resource?.title ?? ""), csv(a.resource?.theme?.subject?.name ?? ""),
        a.score, a.max_score, a.percent, a.grade?.toFixed(2) ?? "", a.duration_seconds,
      ].join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `grades_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const del = async (id: string) => {
    if (!confirm("Изтрий този опит?")) return;
    const { error } = await supabase.from("test_attempts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Изтрит");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Оценки</h1>
          <p className="text-sm text-muted-foreground mt-1">Резултати от ученическите тестове.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Експорт CSV</Button>
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3">
        <Input placeholder="Търси по име, №, клас или тест..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger><SelectValue placeholder="Клас" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всички класове</SelectItem>
            {(classes ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger><SelectValue placeholder="Тест" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всички тестове</SelectItem>
            {resources.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Card className="p-3"><div className="text-muted-foreground text-xs">Опити</div><div className="text-2xl font-semibold">{filtered.length}</div></Card>
        <Card className="p-3"><div className="text-muted-foreground text-xs">Среден успех</div><div className="text-2xl font-semibold text-primary">{avg.toFixed(2)}</div></Card>
        <Card className="p-3"><div className="text-muted-foreground text-xs">Двойки</div><div className="text-2xl font-semibold text-rose-500">{filtered.filter((a) => (a.grade ?? 0) < 3).length}</div></Card>
        <Card className="p-3"><div className="text-muted-foreground text-xs">Отличници</div><div className="text-2xl font-semibold text-emerald-500">{filtered.filter((a) => (a.grade ?? 0) >= 5.5).length}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Дата</th>
                <th className="p-3">Ученик</th>
                <th className="p-3">№</th>
                <th className="p-3">Клас</th>
                <th className="p-3">Тест</th>
                <th className="p-3 text-right">Точки</th>
                <th className="p-3 text-right">%</th>
                <th className="p-3 text-right">Оценка</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Зареждане...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Няма опити по тези критерии.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-accent/30 cursor-pointer" onClick={() => setView(a)}>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.submitted_at).toLocaleString("bg-BG")}</td>
                  <td className="p-3 font-medium">{a.student_name}</td>
                  <td className="p-3">{a.student_number || "—"}</td>
                  <td className="p-3">{a.student_class || "—"}</td>
                  <td className="p-3 truncate max-w-xs">{a.resource?.title || "—"}</td>
                  <td className="p-3 text-right tabular-nums">{a.score}/{a.max_score}</td>
                  <td className="p-3 text-right tabular-nums">{a.percent}%</td>
                  <td className="p-3 text-right tabular-nums font-semibold">{a.grade?.toFixed(2) ?? "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setView(a); }}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); del(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{view?.student_name} — {view?.resource?.title}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                {new Date(view.submitted_at).toLocaleString("bg-BG")} · {view.student_class || "—"} · {view.score}/{view.max_score} · {view.percent}% · <strong className="text-foreground">оценка {view.grade?.toFixed(2)}</strong>
              </div>
              {Array.isArray(view.answers) && view.answers.map((d: any, i: number) => (
                <Card key={i} className={`p-3 border-l-4 ${d.correct ? "border-l-emerald-500" : d.type === "open" ? "border-l-amber-500" : "border-l-rose-500"}`}>
                  <div className="flex gap-2">
                    {d.type === "mc" ? (d.correct ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />) : <ClipboardList className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <div className="font-medium">{i + 1}. {d.q}</div>
                      <div className="mt-1 text-xs"><span className="text-muted-foreground">Отговор:</span> {d.given || <em>(няма)</em>}</div>
                      {d.type === "mc" && <div className="text-xs"><span className="text-muted-foreground">Верен:</span> <span className="text-emerald-600 dark:text-emerald-400">{d.expected}</span></div>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function csv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
