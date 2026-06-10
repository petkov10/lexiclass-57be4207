import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery, classSubjectsQuery, resourcesForThemeQuery, fileUrl } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ResourceRow, ResourceType } from "@/lib/types";
import { sanitizeFileName } from "@/lib/storage";

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
              return (
                <div key={r.id} className="p-3 flex items-center gap-3">
                  <div className="text-xs uppercase tracking-wider rounded bg-muted px-2 py-1 w-28 text-center font-medium shrink-0">{TYPES.find((t) => t.value === r.type)?.label}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                  </div>
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
        content: ["task", "code", "note"].includes(type) ? content : null,
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
          <div><Label>Език</Label><Input value={content.language || ""} onChange={(e) => setC("language", e.target.value)} /></div>
          <div><Label>Код</Label><Textarea rows={10} className="font-mono text-xs" value={content.code || ""} onChange={(e) => setC("code", e.target.value)} /></div>
        </div>
      )}

      {type === "note" && (
        <div><Label>Текст (Markdown)</Label><Textarea rows={8} value={content.text || ""} onChange={(e) => setC("text", e.target.value)} /></div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving || !title.trim()}>{saving ? "Запазване..." : "Запази"}</Button>
      </div>
    </div>
  );
}
