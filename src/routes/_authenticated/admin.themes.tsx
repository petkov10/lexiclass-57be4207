import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery, classSubjectsQuery, homeworkForThemeQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, X, Upload, Copy, GripVertical, StickyNote, BookCheck } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/themes")({
  component: ThemesAdmin,
});

function ThemesAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);

  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];

  const { data: themes } = useQuery({ ...themesQuery(classId, subjectId), enabled: !!classId && !!subjectId });

  const { data: notedThemeIds } = useQuery({
    queryKey: ["theme_private_notes_ids", classId, subjectId, (themes ?? []).map((t) => t.id).join(",")],
    enabled: !!themes && themes.length > 0,
    queryFn: async () => {
      const ids = (themes ?? []).map((t) => t.id);
      if (ids.length === 0) return new Set<string>();
      const { data } = await supabase.from("theme_private_notes").select("theme_id").in("theme_id", ids);
      return new Set((data ?? []).map((r) => r.theme_id));
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [week, setWeek] = useState("");
  const [color, setColor] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: "", description: "", week: "", color: "", tags: "" });
  const [notesFor, setNotesFor] = useState<{ id: string; name: string; notes: string } | null>(null);
  const [duplicateFor, setDuplicateFor] = useState<{ id: string; name: string } | null>(null);
  const [homeworkFor, setHomeworkFor] = useState<{ id: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["themes", classId, subjectId] });
    qc.invalidateQueries({ queryKey: ["theme_private_notes_ids"] });
  };

  const openNotes = async (id: string, name: string) => {
    const { data } = await supabase.from("theme_private_notes").select("notes").eq("theme_id", id).maybeSingle();
    setNotesFor({ id, name, notes: data?.notes ?? "" });
  };

  const add = async () => {
    if (!classId || !subjectId || !name.trim()) return;
    const order = (themes?.length ?? 0) + 1;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("themes").insert({
      class_id: classId, subject_id: subjectId, name: name.trim(),
      description: description || null, week_number: week ? parseInt(week) : null, order_index: order,
      color: color || null, tags,
    } as any);
    if (error) return toast.error(error.message);
    setName(""); setDescription(""); setWeek(""); setColor(""); setTagsInput(""); refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Изтриване на темата и всички ресурси?")) return;
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const save = async () => {
    if (!editId) return;
    const tags = editValues.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("themes").update({
      name: editValues.name, description: editValues.description || null,
      week_number: editValues.week ? parseInt(editValues.week) : null,
      color: editValues.color || null, tags,
    } as any).eq("id", editId);
    if (error) return toast.error(error.message);
    setEditId(null); refresh();
  };

  const saveNotes = async () => {
    if (!notesFor) return;
    const trimmed = notesFor.notes.trim();
    if (!trimmed) {
      const { error } = await supabase.from("theme_private_notes").delete().eq("theme_id", notesFor.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("theme_private_notes").upsert({ theme_id: notesFor.id, notes: trimmed });
      if (error) return toast.error(error.message);
    }
    setNotesFor(null); refresh();
    toast.success("Бележките са запазени");
  };

  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);

  const importFromBuffer = async (buf: ArrayBuffer) => {
    if (!classId || !subjectId) { toast.error("Първо изберете клас и предмет"); return; }
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
    const baseOrder = themes?.length ?? 0;
    const inserts = rows.map((r, i) => {
      const name = r["Тема"] || r["Theme"] || r["Name"] || r["Урок"] || r["Заглавие"] || Object.values(r)[0];
      const desc = r["Описание"] || r["Description"] || r["Бележки"] || null;
      const wk = r["Седмица"] || r["Week"] || r["№"] || r["No"] || null;
      return { class_id: classId, subject_id: subjectId, name: String(name || "").trim(), description: desc ? String(desc) : null, week_number: wk ? parseInt(String(wk)) || null : null, order_index: baseOrder + i + 1 };
    }).filter((r) => r.name);
    if (!inserts.length) { toast.error("Не са открити теми в таблицата"); return; }
    const { error } = await supabase.from("themes").insert(inserts);
    if (error) throw error;
    toast.success(`Импортирани ${inserts.length} теми`);
    refresh();
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      await importFromBuffer(buf);
    } catch (err: any) {
      toast.error(err.message || "Грешка при импорта");
    } finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  // Convert Google Drive / Google Sheets / OneDrive share URL to a direct downloadable xlsx URL
  const resolveCloudUrl = (raw: string): string | null => {
    const s = raw.trim();
    if (!s) return null;
    // Google Sheets
    let m = s.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`;
    // Google Drive file
    m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    m = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    // OneDrive short link or full: use shares API with base64url encoding
    if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/i.test(s)) {
      const b64 = btoa(s).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
      return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`;
    }
    return null;
  };

  const importFromCloud = async () => {
    const url = resolveCloudUrl(cloudUrl);
    if (!url) { toast.error("Неразпознат линк. Използвай Google Sheets/Drive или OneDrive линк за споделяне."); return; }
    setCloudLoading(true);
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`Неуспешно сваляне (${res.status}). Провери правата за достъп — линкът трябва да е публичен или „всеки с линка"`);
      const buf = await res.arrayBuffer();
      await importFromBuffer(buf);
      setCloudUrl("");
      setCloudOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Грешка при импорта от облак");
    } finally {
      setCloudLoading(false);
    }
  };


  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !themes) return;
    const oldIdx = themes.findIndex((t) => t.id === active.id);
    const newIdx = themes.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(themes, oldIdx, newIdx);
    qc.setQueryData(["themes", classId, subjectId], reordered);
    await Promise.all(reordered.map((t, i) => supabase.from("themes").update({ order_index: i + 1 }).eq("id", t.id)));
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Тематично разпределение</h1>
        <p className="text-sm text-muted-foreground mt-1">Изберете клас и предмет. Можете да влачите темите за пренареждане.</p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Клас</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}>
            <SelectTrigger><SelectValue placeholder="Изберете клас" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Предмет</Label>
          <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder={classId ? "Изберете предмет" : "Първо клас"} /></SelectTrigger>
            <SelectContent>{availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload /> Импорт от Excel</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2">
              <Input placeholder="№" value={week} onChange={(e) => setWeek(e.target.value)} />
              <Input placeholder="Име на темата" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Textarea placeholder="Описание (по желание)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 items-center">
              <div className="flex items-center gap-2">
                <input type="color" value={color || "#3b82f6"} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 rounded border cursor-pointer" aria-label="Цвят" />
                {color && <Button variant="ghost" size="sm" onClick={() => setColor("")}>Изчисти</Button>}
              </div>
              <Input placeholder="Тагове (разделени със запетая)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
            </div>
            <Button onClick={add}><Plus /> Добави тема</Button>
          </Card>

          <Card>
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={(themes ?? []).map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {(themes ?? []).map((t) => (
                    <SortableThemeRow
                      key={t.id} t={t}
                      isEditing={editId === t.id}
                      editValues={editValues}
                      setEditValues={setEditValues}
                      onStartEdit={() => { setEditId(t.id); setEditValues({ name: t.name, description: t.description ?? "", week: t.week_number?.toString() ?? "", color: (t as any).color ?? "", tags: ((t as any).tags ?? []).join(", ") }); }}
                      onCancelEdit={() => setEditId(null)}
                      onSave={save}
                      onRemove={() => remove(t.id)}
                      onOpenNotes={() => openNotes(t.id, t.name)}
                      hasNotes={notedThemeIds?.has(t.id) ?? false}
                      onDuplicate={() => setDuplicateFor({ id: t.id, name: t.name })}
                      onHomework={() => setHomeworkFor({ id: t.id, name: t.name })}
                    />
                  ))}
                  {(!themes || themes.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">Все още няма теми.</div>}
                </div>
              </SortableContext>
            </DndContext>
          </Card>
        </>
      )}

      <Dialog open={!!notesFor} onOpenChange={(v) => !v && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Лични бележки: {notesFor?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Тези бележки са видими само за учители в админ панела. Не се показват публично.</p>
          <Textarea rows={10} value={notesFor?.notes ?? ""} onChange={(e) => setNotesFor((p) => p ? { ...p, notes: e.target.value } : p)} placeholder="Напр. подсказки, на какво да обърна внимание, типични грешки..." />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setNotesFor(null)}>Отказ</Button><Button onClick={saveNotes}><Save /> Запази</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicateFor} onOpenChange={(v) => !v && setDuplicateFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Дублирай тема: {duplicateFor?.name}</DialogTitle></DialogHeader>
          {duplicateFor && <DuplicateForm themeId={duplicateFor.id} onDone={() => { setDuplicateFor(null); refresh(); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!homeworkFor} onOpenChange={(v) => !v && setHomeworkFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookCheck className="h-4 w-4" /> Домашни към: {homeworkFor?.name}</DialogTitle></DialogHeader>
          {homeworkFor && <HomeworkManager themeId={homeworkFor.id} userId={user?.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableThemeRow({ t, isEditing, editValues, setEditValues, onStartEdit, onCancelEdit, onSave, onRemove, onOpenNotes, onDuplicate, onHomework, hasNotes }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="p-3 flex items-center gap-2 bg-card">
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></button>
      {isEditing ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[80px_1fr_2fr_auto] gap-2 items-center">
          <Input value={editValues.week} onChange={(e) => setEditValues((v: any) => ({ ...v, week: e.target.value }))} placeholder="№" />
          <Input value={editValues.name} onChange={(e) => setEditValues((v: any) => ({ ...v, name: e.target.value }))} />
          <Input value={editValues.description} onChange={(e) => setEditValues((v: any) => ({ ...v, description: e.target.value }))} placeholder="Описание" />
          <div className="flex gap-1">
            <Button size="sm" onClick={onSave}><Save /></Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}><X /></Button>
          </div>
          <div className="md:col-span-4 flex items-center gap-2">
            <input type="color" value={editValues.color || "#3b82f6"} onChange={(e) => setEditValues((v: any) => ({ ...v, color: e.target.value }))} className="h-8 w-8 rounded border cursor-pointer" aria-label="Цвят" />
            {editValues.color && <Button variant="ghost" size="sm" onClick={() => setEditValues((v: any) => ({ ...v, color: "" }))}>Без цвят</Button>}
            <Input className="flex-1" value={editValues.tags} onChange={(e) => setEditValues((v: any) => ({ ...v, tags: e.target.value }))} placeholder="Тагове (a, b, c)" />
          </div>
        </div>
      ) : (
        <>
          <div
            className="h-8 w-8 rounded-md grid place-items-center text-xs font-medium shrink-0"
            style={t.color ? { background: `${t.color}22`, color: t.color, boxShadow: `inset 0 0 0 1px ${t.color}55` } : undefined}
          >
            <span className={t.color ? "" : "text-primary"}>{t.week_number ?? "—"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{t.name}</div>
            {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
            {(t.tags?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {t.tags.map((tag: string) => (
                  <span key={tag} className="text-[10px] rounded-full bg-muted px-2 py-0.5">{tag}</span>
                ))}
              </div>
            )}
          </div>
          {hasNotes && <span title="Има лични бележки" className="text-amber-500"><StickyNote className="h-3.5 w-3.5" /></span>}
          <Button size="sm" variant="ghost" onClick={onHomework} title="Домашни"><BookCheck className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onOpenNotes} title="Лични бележки"><StickyNote className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onDuplicate} title="Копирай в друг клас"><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onStartEdit}>Редактирай</Button>
          <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="text-destructive" /></Button>
        </>
      )}
    </div>
  );
}

function DuplicateForm({ themeId, onDone }: { themeId: string; onDone: () => void }) {
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [copyResources, setCopyResources] = useState(true);
  const [busy, setBusy] = useState(false);
  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];

  const run = async () => {
    setBusy(true);
    try {
      const { data: src } = await supabase.from("themes").select("*").eq("id", themeId).maybeSingle();
      if (!src) throw new Error("Темата не е намерена");
      const { count: cnt } = await supabase.from("themes").select("*", { count: "exact", head: true }).eq("class_id", classId).eq("subject_id", subjectId);
      const { data: newTheme, error } = await supabase.from("themes").insert({
        class_id: classId, subject_id: subjectId,
        name: src.name, description: src.description, week_number: src.week_number,
        order_index: (cnt ?? 0) + 1,
      }).select().single();
      if (error) throw error;
      const { data: srcNotes } = await supabase.from("theme_private_notes").select("notes").eq("theme_id", themeId).maybeSingle();
      if (srcNotes?.notes) {
        await supabase.from("theme_private_notes").insert({ theme_id: newTheme.id, notes: srcNotes.notes });
      }
      if (copyResources) {
        const { data: res } = await supabase.from("resources").select("*").eq("theme_id", themeId);
        if (res?.length) {
          const copies = res.map(({ id, theme_id, created_at, ...rest }) => ({ ...rest, theme_id: newTheme.id }));
          await supabase.from("resources").insert(copies as any);
        }
      }
      toast.success("Темата е дублирана");
      onDone();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Целеви клас</Label>
        <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}>
          <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
          <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Предмет</Label>
        <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={copyResources} onChange={(e) => setCopyResources(e.target.checked)} /> Копирай и всички ресурси</label>
      <Button onClick={run} disabled={busy || !classId || !subjectId}><Copy /> {busy ? "Копиране..." : "Дублирай"}</Button>
    </div>
  );
}

function HomeworkManager({ themeId, userId }: { themeId: string; userId?: string }) {
  const qc = useQueryClient();
  const { data: items } = useQuery(homeworkForThemeQuery(themeId));
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["homework", themeId] });
  const add = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("homework").insert({
      theme_id: themeId, title: title.trim(), description: desc || null,
      deadline: deadline || null, created_by: userId,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setDesc(""); setDeadline(""); refresh();
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2 border-b pb-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заглавие" />
        <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Описание / задание" />
        <div className="flex gap-2">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="flex-1" />
          <Button onClick={add} disabled={!title.trim()}><Plus /> Добави</Button>
        </div>
      </div>
      <div className="space-y-2 max-h-[40vh] overflow-auto">
        {(items ?? []).map((h) => (
          <div key={h.id} className="flex items-start gap-2 rounded border p-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{h.title}</div>
              {h.description && <div className="text-xs text-muted-foreground line-clamp-2">{h.description}</div>}
              {h.deadline && <div className="text-xs text-primary mt-1">До: {new Date(h.deadline).toLocaleDateString("bg-BG")}</div>}
            </div>
            <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("homework").delete().eq("id", h.id); refresh(); }}>
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        ))}
        {(items?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground text-center py-4">Няма домашни.</p>}
      </div>
    </div>
  );
}
