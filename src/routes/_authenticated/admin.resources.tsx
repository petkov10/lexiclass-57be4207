import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery, classSubjectsQuery, resourcesForThemeQuery, fileUrl } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ResourceRow, ResourceType, Flashcard } from "@/lib/types";
import { sanitizeFileName } from "@/lib/storage";
import { Sparkles, BookOpen, Layers as LayersIcon, X } from "lucide-react";

const CODE_LANGUAGES = ["csharp", "html", "css", "sql", "javascript", "typescript", "python", "cpp", "java", "json", "bash"];

const TYPES: { value: ResourceType; label: string }[] = [
  { value: "presentation", label: "Презентация" },
  { value: "document", label: "Документ" },
  { value: "link", label: "Линк" },
  { value: "video", label: "Видео" },
  { value: "test", label: "Тест" },
  { value: "task", label: "Задача" },
  { value: "code", label: "Код" },
  { value: "image", label: "Изображение" },
  { value: "note", label: "Бележка" },
  { value: "notebooklm", label: "NotebookLM" },
  { value: "flashcards", label: "Флаш карти" },
  { value: "other", label: "Друго" },
];

export const Route = createFileRoute("/_authenticated/admin/resources")({
  component: ResourcesAdmin,
});

function ResourcesAdmin() {
  const qc = useQueryClient();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [themeId, setThemeId] = useState("");

  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];

  const { data: themes } = useQuery({ ...themesQuery(classId, subjectId), enabled: !!classId && !!subjectId });
  const { data: resources } = useQuery({ ...resourcesForThemeQuery(themeId), enabled: !!themeId });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["resources", themeId] });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ресурси</h1>
          <p className="text-sm text-muted-foreground mt-1">Качете материали към избраната тема.</p>
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Клас</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); setThemeId(""); }}>
            <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Предмет</Label>
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setThemeId(""); }} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
            <SelectContent>{availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Тема</Label>
          <Select value={themeId} onValueChange={setThemeId} disabled={!subjectId}>
            <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
            <SelectContent>{themes?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      {themeId && (
        <>
          <BulkUploader themeId={themeId} baseOrder={resources?.length ?? 0} onDone={refresh} />
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild><Button><Plus /> Нов ресурс</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
                <DialogHeader><DialogTitle>{editing ? "Редактирай ресурс" : "Нов ресурс"}</DialogTitle></DialogHeader>
                <ResourceForm
                  themeId={themeId}
                  existing={editing}
                  orderHint={(resources?.length ?? 0) + 1}
                  onDone={() => { setOpen(false); setEditing(null); refresh(); }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card className="divide-y">
            {(resources ?? []).map((r) => {
              const url = r.url || fileUrl(r.file_path);
              const testUrl = r.type === "test" ? `${typeof window !== "undefined" ? window.location.origin : ""}/test/${r.id}` : null;
              return (
                <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
                  <div className="text-xs uppercase tracking-wider rounded bg-muted px-2 py-1 w-28 text-center font-medium shrink-0">{TYPES.find((t) => t.value === r.type)?.label}</div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium truncate">{r.title}</div>
                    {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                  </div>
                  {testUrl && <QrCodeButton url={testUrl} label="QR" title={`QR за ${r.title}`} />}
                  {r.type === "test" && <Button asChild variant="outline" size="sm"><a href={`/test/${r.id}/print`} target="_blank" rel="noreferrer">Печат</a></Button>}
                  {url && <Button asChild variant="ghost" size="sm"><a href={url} target="_blank" rel="noreferrer"><ExternalLink /></a></Button>}
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(r as ResourceRow); setOpen(true); }}><Edit /></Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    if (!confirm("Изтрий ресурса?")) return;
                    await supabase.from("resources").delete().eq("id", r.id);
                    refresh();
                  }}><Trash2 className="text-destructive" /></Button>
                </div>
              );
            })}
            {(!resources || resources.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">Все още няма ресурси за тази тема.</div>}
          </Card>
        </>
      )}
    </div>
  );
}

function ResourceForm({ themeId, existing, orderHint, onDone }: { themeId: string; existing: ResourceRow | null; orderHint: number; onDone: () => void }) {
  const [type, setType] = useState<ResourceType>(existing?.type ?? "presentation");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<Record<string, string>>(
    (existing?.content as Record<string, string>) ?? {}
  );
  const [cards, setCards] = useState<Flashcard[]>(
    ((existing?.content as { flashcards?: Flashcard[] } | null)?.flashcards) ?? []
  );
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      let filePath = existing?.file_path ?? null;
      if (file) {
        const path = `${themeId}/${Date.now()}_${sanitizeFileName(file.name)}`;
        const { error } = await supabase.storage.from("resources").upload(path, file);
        if (error) throw error;
        filePath = path;
      }
      const payload = {
        theme_id: themeId,
        type,
        title: title.trim(),
        description: description || null,
        url: url || null,
        file_path: filePath,
        content:
          type === "flashcards"
            ? { flashcards: cards.filter((c) => c.front.trim() || c.back.trim()) }
            : ["task", "code", "note"].includes(type)
            ? content
            : null,
        order_index: existing?.order_index ?? orderHint,
      };
      const { error } = existing
        ? await supabase.from("resources").update(payload).eq("id", existing.id)
        : await supabase.from("resources").insert(payload);
      if (error) throw error;
      toast.success("Запазено");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const setC = (k: string, v: string) => setContent((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Тип</Label>
          <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Заглавие</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Кратко описание</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {(type === "link" || type === "video") && (
        <div>
          <Label>URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
      )}

      {(type === "presentation" || type === "document" || type === "image" || type === "test" || type === "other") && (
        <div className="space-y-2">
          <Label>Файл {existing?.file_path && "(оставете празно, за да запазите текущия)"}</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="text-xs text-muted-foreground">или връзка като алтернатива:</div>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
      )}

      {type === "task" && (
        <div className="space-y-3">
          <div><Label>Условие</Label><Textarea rows={3} value={content.statement || ""} onChange={(e) => setC("statement", e.target.value)} /></div>
          <div><Label>Насоки за решаване</Label><Textarea rows={2} value={content.hints || ""} onChange={(e) => setC("hints", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Примерен вход</Label><Textarea rows={3} value={content.sample_input || ""} onChange={(e) => setC("sample_input", e.target.value)} /></div>
            <div><Label>Примерен изход</Label><Textarea rows={3} value={content.sample_output || ""} onChange={(e) => setC("sample_output", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-[1fr_3fr] gap-3">
            <div>
              <Label>Език</Label>
              <Select value={content.language || "csharp"} onValueChange={(v) => setC("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CODE_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Решение</Label><Textarea rows={6} className="font-mono text-xs" value={content.solution || ""} onChange={(e) => setC("solution", e.target.value)} /></div>
          </div>
        </div>
      )}

      {type === "code" && (
        <div className="grid grid-cols-[1fr_3fr] gap-3">
          <div>
            <Label>Език</Label>
            <Select value={content.language || "csharp"} onValueChange={(v) => setC("language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CODE_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Код</Label><Textarea rows={10} className="font-mono text-xs" value={content.code || ""} onChange={(e) => setC("code", e.target.value)} /></div>
        </div>
      )}

      {type === "note" && (
        <div><Label>Текст (Markdown)</Label><Textarea rows={8} value={content.text || ""} onChange={(e) => setC("text", e.target.value)} /></div>
      )}

      {type === "notebooklm" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> NotebookLM линк</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://notebooklm.google.com/notebook/..." />
          <p className="text-xs text-muted-foreground">
            Отвори notebook-а в NotebookLM → бутон <strong>Share</strong> → копирай линка и го постави тук.
            Ученикът ще го отвори с един клик от темата.
          </p>
        </div>
      )}

      {type === "flashcards" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Генерирай с AI</div>
            <div className="grid grid-cols-[1fr_100px_auto] gap-2">
              <Input placeholder="Тема (напр. SQL JOIN-и)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
              <Input type="number" min={3} max={25} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value) || 10)} />
              <Button
                type="button"
                disabled={aiLoading || !aiTopic.trim()}
                onClick={async () => {
                  setAiLoading(true);
                  try {
                    const res = await fetch("/api/ai-flashcards", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ topic: aiTopic, count: aiCount, context: description }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const j = (await res.json()) as { flashcards: Flashcard[] };
                    setCards((p) => [...p, ...j.flashcards]);
                    if (!title.trim()) setTitle(aiTopic);
                    toast.success(`Добавени ${j.flashcards.length} карти`);
                  } catch (e: any) {
                    toast.error(e.message || "Грешка при генериране");
                  } finally {
                    setAiLoading(false);
                  }
                }}
              >
                {aiLoading ? "..." : "Генерирай"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><LayersIcon className="h-4 w-4" /> Карти ({cards.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setCards((p) => [...p, { front: "", back: "" }])}><Plus className="h-3.5 w-3.5" /> Добави</Button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
              {cards.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                  <Textarea rows={2} placeholder="Лице (въпрос)" value={c.front} onChange={(e) => setCards((p) => p.map((x, j) => j === i ? { ...x, front: e.target.value } : x))} />
                  <Textarea rows={2} placeholder="Гръб (отговор)" value={c.back} onChange={(e) => setCards((p) => p.map((x, j) => j === i ? { ...x, back: e.target.value } : x))} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCards((p) => p.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {cards.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Все още няма карти. Генерирай с AI или добави ръчно.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving || !title.trim()}>{saving ? "Запазване..." : "Запази"}</Button>
      </div>
    </div>
  );
}

function inferType(name: string): ResourceType {
  const n = name.toLowerCase();
  if (/\.(pptx?|key|odp)$/.test(n)) return "presentation";
  if (/\.(docx?|odt|rtf|txt|md|pdf)$/.test(n)) return "document";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(n)) return "image";
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(n)) return "video";
  if (/\.(cs|html|css|sql|js|ts|tsx|jsx|py|cpp|java|json|sh)$/.test(n)) return "code";
  return "other";
}

function BulkUploader({ themeId, baseOrder, onDone }: { themeId: string; baseOrder: number; onDone: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setProgress({ done: 0, total: arr.length });
    let i = 0;
    for (const file of arr) {
      const type = inferType(file.name);
      try {
        const path = `${themeId}/${Date.now()}_${i}_${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("resources").upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("resources").insert({
          theme_id: themeId, type, title: file.name.replace(/\.[^.]+$/, ""),
          file_path: path, order_index: baseOrder + i + 1,
        });
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message}`);
      }
      i++;
      setProgress({ done: i, total: arr.length });
    }
    setProgress(null);
    toast.success(`Качени ${arr.length} файла`);
    onDone();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
      {progress ? (
        <div className="text-sm">Качване... <strong>{progress.done}/{progress.total}</strong></div>
      ) : (
        <>
          <div className="font-medium text-sm">Влачи и пусни файлове тук</div>
          <div className="text-xs text-muted-foreground mt-1">или кликни — типът се разпознава автоматично</div>
        </>
      )}
    </div>
  );
}

