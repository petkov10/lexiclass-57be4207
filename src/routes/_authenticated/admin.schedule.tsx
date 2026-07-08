import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, classSubjectsQuery, themesQuery, mySchedulesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/schedule")({
  component: ScheduleAdmin,
});

const DAYS = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

function ScheduleAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);
  const { data: schedule } = useQuery(mySchedulesQuery(user?.id));

  const [day, setDay] = useState<string>("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:40");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [themeId, setThemeId] = useState<string>("");

  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];
  const { data: themes } = useQuery({ ...themesQuery(classId, subjectId), enabled: !!classId && !!subjectId });

  const refresh = () => qc.invalidateQueries({ queryKey: ["schedules", user?.id] });

  const add = async () => {
    if (!classId || !subjectId || !user) return;
    const { error } = await supabase.from("schedules").insert({
      owner_id: user.id,
      day_of_week: parseInt(day),
      start_time: start,
      end_time: end,
      class_id: classId,
      subject_id: subjectId,
      theme_id: themeId || null,
    });
    if (error) return toast.error(error.message);
    setClassId(""); setSubjectId(""); setThemeId("");
    refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("schedules").delete().eq("id", id);
    refresh();
  };

  const byDay: Record<number, typeof schedule> = {};
  (schedule ?? []).forEach((s) => {
    (byDay[s.day_of_week] ??= [] as any).push(s);
  });

  const [view, setView] = useState<"list" | "week">("week");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Моето разписание</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Добавете часовете си. Плъзнете час, за да го преместите между дни или часове.
          </p>
        </div>
        <div className="inline-flex rounded-md border p-0.5 text-sm shrink-0">
          <button onClick={() => setView("week")} className={`px-3 py-1.5 rounded ${view === "week" ? "bg-primary text-primary-foreground" : ""}`}>Седмица</button>
          <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}>Списък</button>
        </div>
      </div>


      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Добави час</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Ден</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>От</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>До</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div>
            <Label>Клас</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); setThemeId(""); }}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Предмет</Label>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setThemeId(""); }} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Конкретна тема (по желание)</Label>
            <Select value={themeId} onValueChange={setThemeId} disabled={!subjectId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{themes?.map((t) => <SelectItem key={t.id} value={t.id}>{t.week_number ? `${t.week_number}. ` : ""}{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="self-end"><Button onClick={add} disabled={!classId || !subjectId}><Plus /> Добави</Button></div>
        </div>
      </Card>

      <div className="grid gap-3">
        {DAYS.map((d, i) => {
          const items = byDay[i] ?? [];
          if (items.length === 0) return null;
          return (
            <Card key={i}>
              <div className="px-4 py-2 border-b font-medium text-sm">{d}</div>
              <div className="divide-y">
                {items.map((s: any) => (
                  <div key={s.id} className="p-3 flex items-center gap-3">
                    <div className="font-mono text-sm w-28 text-muted-foreground">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.class?.name} · {s.subject?.name}</div>
                      {s.theme && <div className="text-xs text-muted-foreground truncate">→ {s.theme.name}</div>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {(schedule?.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Още няма часове в разписанието.</div>
        )}
      </div>
    </div>
  );
}
