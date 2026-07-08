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

      {view === "list" ? (
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
      ) : (
        <WeekGrid schedule={schedule ?? []} onRemove={remove} onRefresh={refresh} />
      )}
    </div>
  );
}

// ------------ Week grid with drag & drop ------------

import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";

const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 07:00 – 18:00
const HOUR_H = 56; // px per hour

function toMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function fromMinutes(mins: number) { const h = Math.floor(mins / 60); const m = mins % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`; }

function WeekGrid({ schedule, onRemove, onRefresh }: { schedule: any[]; onRemove: (id: string) => void; onRefresh: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id);
    const [targetDay, targetHour] = String(e.over.id).split(":").map(Number);
    const item = schedule.find((s) => s.id === id);
    if (!item) return;
    const originalStart = toMinutes(item.start_time);
    const duration = toMinutes(item.end_time) - originalStart;
    // Snap to 5-min grid using vertical delta from hour-row containers.
    const rawOffset = Math.round(e.delta.y / (HOUR_H / 12)) * 5; // 5-min steps
    const newStart = Math.max(0, targetHour * 60 + (originalStart % 60) + rawOffset);
    const newEnd = newStart + duration;
    if (item.day_of_week === targetDay && newStart === originalStart) return;
    const { error } = await supabase
      .from("schedules")
      .update({ day_of_week: targetDay, start_time: fromMinutes(newStart), end_time: fromMinutes(newEnd) })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Часът е преместен"); onRefresh(); }
  };

  const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <Card className="overflow-auto">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dayIndices.length}, 1fr)` }}>
            <div className="border-b border-r p-2 text-xs text-muted-foreground bg-muted/40">Час</div>
            {dayIndices.map((di) => (
              <div key={di} className="border-b p-2 text-xs font-medium bg-muted/40 text-center">{DAYS[di].slice(0, 3)}</div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="border-r border-b p-1 text-[10px] text-muted-foreground text-right pr-2" style={{ height: HOUR_H }}>{String(h).padStart(2, "0")}:00</div>
                {dayIndices.map((di) => (
                  <DropCell key={`${di}:${h}`} id={`${di}:${h}`}>
                    {schedule
                      .filter((s) => s.day_of_week === di && Math.floor(toMinutes(s.start_time) / 60) === h)
                      .map((s) => (
                        <DraggableEvent key={s.id} item={s} onRemove={onRemove} />
                      ))}
                  </DropCell>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </DndContext>
  );
}

function DropCell({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`relative border-b border-r ${isOver ? "bg-primary/10" : ""}`} style={{ height: HOUR_H }}>
      {children}
    </div>
  );
}

function DraggableEvent({ item, onRemove }: { item: any; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const startMins = toMinutes(item.start_time);
  const endMins = toMinutes(item.end_time);
  const offsetTop = (startMins % 60) * (HOUR_H / 60);
  const height = Math.max(20, (endMins - startMins) * (HOUR_H / 60));
  const style: React.CSSProperties = {
    position: "absolute", left: 2, right: 2, top: offsetTop, height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 50 : 10,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className="rounded-md bg-primary/15 border border-primary/40 text-primary text-[11px] leading-tight p-1 overflow-hidden cursor-grab active:cursor-grabbing shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono">{item.start_time.slice(0, 5)}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="opacity-60 hover:opacity-100" title="Изтрий">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="font-medium truncate">{item.class?.name} · {item.subject?.name}</div>
      {item.theme && <div className="truncate opacity-80">→ {item.theme.name}</div>}
    </div>
  );
}

