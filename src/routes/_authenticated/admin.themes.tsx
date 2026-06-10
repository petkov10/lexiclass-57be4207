import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery, classSubjectsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/admin/themes")({
  component: ThemesAdmin,
});

function ThemesAdmin() {
  const qc = useQueryClient();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);

  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];

  const { data: themes } = useQuery({
    ...themesQuery(classId, subjectId),
    enabled: !!classId && !!subjectId,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [week, setWeek] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: "", description: "", week: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["themes", classId, subjectId] });

  const add = async () => {
    if (!classId || !subjectId || !name.trim()) return;
    const order = (themes?.length ?? 0) + 1;
    const { error } = await supabase.from("themes").insert({
      class_id: classId, subject_id: subjectId, name: name.trim(),
      description: description || null, week_number: week ? parseInt(week) : null, order_index: order,
    });
    if (error) return toast.error(error.message);
    setName(""); setDescription(""); setWeek(""); refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Изтриване на темата и всички ресурси?")) return;
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const save = async () => {
    if (!editId) return;
    const { error } = await supabase.from("themes").update({
      name: editValues.name, description: editValues.description || null,
      week_number: editValues.week ? parseInt(editValues.week) : null,
    }).eq("id", editId);
    if (error) return toast.error(error.message);
    setEditId(null); refresh();
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classId || !subjectId) {
      toast.error("Първо изберете клас и предмет");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      const baseOrder = themes?.length ?? 0;
      const inserts = rows.map((r, i) => {
        const name = r["Тема"] || r["Theme"] || r["Name"] || r["Урок"] || r["Заглавие"] || Object.values(r)[0];
        const desc = r["Описание"] || r["Description"] || r["Бележки"] || null;
        const wk = r["Седмица"] || r["Week"] || r["№"] || r["No"] || null;
        return {
          class_id: classId, subject_id: subjectId,
          name: String(name || "").trim(),
          description: desc ? String(desc) : null,
          week_number: wk ? parseInt(String(wk)) || null : null,
          order_index: baseOrder + i + 1,
        };
      }).filter((r) => r.name);
      if (!inserts.length) {
        toast.error("Не са открити теми във файла");
        return;
      }
      const { error } = await supabase.from("themes").insert(inserts);
      if (error) throw error;
      toast.success(`Импортирани ${inserts.length} теми`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Грешка при импорта");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Тематично разпределение</h1>
        <p className="text-sm text-muted-foreground mt-1">Изберете клас и предмет, за да управлявате темите.</p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Клас</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}>
            <SelectTrigger><SelectValue placeholder="Изберете клас" /></SelectTrigger>
            <SelectContent>
              {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Предмет</Label>
          <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder={classId ? "Изберете предмет" : "Първо клас"} /></SelectTrigger>
            <SelectContent>
              {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {classId && subjectId && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Нова тема</h2>
              <div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload /> Импорт от Excel
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2">
              <Input placeholder="№" value={week} onChange={(e) => setWeek(e.target.value)} />
              <Input placeholder="Име на темата" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Textarea placeholder="Описание (по желание)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <Button onClick={add}><Plus /> Добави тема</Button>
            <p className="text-xs text-muted-foreground">
              Excel импорт: колоните могат да са „№/Седмица", „Тема/Заглавие" и „Описание".
            </p>
          </Card>

          <Card className="divide-y">
            {(themes ?? []).map((t) => (
              <div key={t.id} className="p-3 flex items-center gap-2">
                {editId === t.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[80px_1fr_2fr_auto] gap-2 items-center">
                    <Input value={editValues.week} onChange={(e) => setEditValues((v) => ({ ...v, week: e.target.value }))} placeholder="№" />
                    <Input value={editValues.name} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} />
                    <Input value={editValues.description} onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))} placeholder="Описание" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={save}><Save /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X /></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-medium shrink-0">{t.week_number ?? "—"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(t.id); setEditValues({ name: t.name, description: t.description ?? "", week: t.week_number?.toString() ?? "" }); }}>Редактирай</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="text-destructive" /></Button>
                  </>
                )}
              </div>
            ))}
            {(!themes || themes.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">Все още няма теми.</div>}
          </Card>
        </>
      )}
    </div>
  );
}
