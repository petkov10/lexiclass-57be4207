import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, themesQuery, classSubjectsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FolderUp, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { ResourceType, ThemeRow } from "@/lib/types";
import { sanitizeFileName } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
});

const TYPE_LABELS: Record<ResourceType, string> = {
  presentation: "Презентация", document: "Документ", link: "Линк", video: "Видео",
  test: "Тест", task: "Задача", code: "Код", image: "Изображение", note: "Бележка",
  notebooklm: "NotebookLM", flashcards: "Флаш карти", lesson_plan: "Педагогически материал",
  code_exercise: "Код упражнение", other: "Друго",
};

const TYPE_OPTIONS: ResourceType[] = [
  "presentation", "document", "image", "video", "code", "other",
];

function inferType(name: string): ResourceType {
  const n = name.toLowerCase();
  if (/\.(pptx?|key|odp)$/.test(n)) return "presentation";
  if (/\.(docx?|odt|rtf|txt|md|pdf)$/.test(n)) return "document";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(n)) return "image";
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(n)) return "video";
  if (/\.(cs|html|css|sql|js|ts|tsx|jsx|py|cpp|java|json|sh)$/.test(n)) return "code";
  return "other";
}

// Cyrillic-aware normalization for fuzzy matching
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/^[\d\s_.\-–]+/, "") // strip leading numbers like "01_", "1. "
    .replace(/[_\-–.,()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein-based similarity 0..1
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  const dist = dp[n];
  return 1 - dist / Math.max(m, n);
}

type Row = {
  id: string;
  file: File;
  themeId: string | null;
  type: ResourceType;
  confidence: number;
  skip: boolean;
};

function matchTheme(fileName: string, themes: ThemeRow[]): { themeId: string | null; score: number } {
  const fn = normalize(fileName);
  if (!fn || themes.length === 0) return { themeId: null, score: 0 };
  let best: ThemeRow | null = null;
  let bestScore = 0;
  for (const t of themes) {
    const tn = normalize(t.name);
    let s = similarity(fn, tn);
    // bonus if file name contains theme name or vice versa
    if (fn.includes(tn) || tn.includes(fn)) s = Math.max(s, 0.85);
    if (s > bestScore) { bestScore = s; best = t; }
  }
  return { themeId: best && bestScore >= 0.45 ? best.id : null, score: bestScore };
}

function ImportPage() {
  const qc = useQueryClient();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: links } = useQuery(classSubjectsQuery);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const subjectIdsForClass = new Set(links?.filter((l) => l.class_id === classId).map((l) => l.subject_id));
  const availableSubjects = subjects?.filter((s) => subjectIdsForClass.has(s.id)) ?? [];

  const { data: themes } = useQuery({ ...themesQuery(classId, subjectId), enabled: !!classId && !!subjectId });

  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    if (!themes || themes.length === 0) {
      toast.error("Първо избери клас и предмет с теми");
      return;
    }
    const arr = Array.from(files);
    const newRows: Row[] = arr.map((file, i) => {
      const { themeId, score } = matchTheme(file.name, themes);
      return {
        id: `${Date.now()}_${i}_${file.name}`,
        file,
        themeId,
        type: inferType(file.name),
        confidence: score,
        skip: false,
      };
    });
    setRows(newRows);
  };

  const matched = useMemo(() => rows.filter((r) => r.themeId && !r.skip).length, [rows]);
  const unmatched = useMemo(() => rows.filter((r) => !r.themeId && !r.skip).length, [rows]);

  const doImport = async () => {
    const toImport = rows.filter((r) => r.themeId && !r.skip);
    if (toImport.length === 0) {
      toast.error("Няма какво да се импортира");
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: toImport.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        const path = `${r.themeId}/${Date.now()}_${i}_${sanitizeFileName(r.file.name)}`;
        const { error: upErr } = await supabase.storage.from("resources").upload(path, r.file);
        if (upErr) throw upErr;
        const title = r.file.name.replace(/\.[^.]+$/, "").replace(/^[\d\s_.\-–]+/, "").trim() || r.file.name;
        const { error } = await supabase.from("resources").insert({
          theme_id: r.themeId!, type: r.type, title,
          file_path: path, order_index: 1000 + i,
        });
        if (error) throw error;
        ok++;
      } catch (e: any) {
        fail++;
        toast.error(`${r.file.name}: ${e.message}`);
      }
      setProgress({ done: i + 1, total: toImport.length });
    }
    setImporting(false);
    setProgress(null);
    toast.success(`Импортирани ${ok} ресурса${fail > 0 ? ` · ${fail} грешки` : ""}`);
    if (ok > 0) {
      setRows([]);
      qc.invalidateQueries({ queryKey: ["resources"] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FolderUp className="text-primary" /> Групов импорт от папка
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Качи цяла папка с файлове — системата автоматично разпознава темите по име на файла и определя типа по разширението. Можеш да коригираш разпознатото преди импорт.
        </p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Клас</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); setRows([]); }}>
            <SelectTrigger><SelectValue placeholder="Избери" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Предмет</Label>
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setRows([]); }} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Избери" /></SelectTrigger>
            <SelectContent>{availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      {classId && subjectId && (
        <>
          {(!themes || themes.length === 0) ? (
            <Card className="p-6 text-sm text-muted-foreground text-center">
              Този предмет няма теми. Първо добави теми в <strong>Теми</strong>.
            </Card>
          ) : (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 p-8 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  // @ts-expect-error directory attrs are non-standard
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <div className="font-medium">Влачи папка тук или кликни</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Системата ще съпостави имената на файловете с темите ({themes.length} налични)
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    const i = document.createElement("input");
                    i.type = "file"; i.multiple = true;
                    i.onchange = () => i.files && handleFiles(i.files);
                    i.click();
                  }}>Или избери отделни файлове</Button>
                </div>
              </div>

              {rows.length > 0 && (
                <>
                  <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-sm">
                      <span className="text-primary font-medium">{matched}</span> разпознати ·{" "}
                      <span className="text-amber-600 font-medium">{unmatched}</span> неразпознати ·{" "}
                      <span className="text-muted-foreground">{rows.length} общо</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setRows([])} disabled={importing}>Изчисти</Button>
                      <Button onClick={doImport} disabled={importing || matched === 0}>
                        {importing && progress
                          ? `Импортиране ${progress.done}/${progress.total}...`
                          : `Импортирай ${matched} ресурса`}
                      </Button>
                    </div>
                  </Card>

                  <Card className="divide-y">
                    <div className="px-3 py-2 grid grid-cols-[1fr_1.2fr_140px_50px_40px] gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      <div>Файл</div><div>Тема</div><div>Тип</div><div>Точност</div><div></div>
                    </div>
                    {rows.map((r) => (
                      <RowItem
                        key={r.id}
                        row={r}
                        themes={themes}
                        onChange={(patch) => setRows((p) => p.map((x) => x.id === r.id ? { ...x, ...patch } : x))}
                        onRemove={() => setRows((p) => p.filter((x) => x.id !== r.id))}
                      />
                    ))}
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function RowItem({ row, themes, onChange, onRemove }: {
  row: Row; themes: ThemeRow[];
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const conf = Math.round(row.confidence * 100);
  return (
    <div className={`px-3 py-2 grid grid-cols-[1fr_1.2fr_140px_50px_40px] gap-2 items-center text-sm ${row.skip ? "opacity-40" : ""}`}>
      <div className="truncate" title={row.file.name}>
        {row.themeId ? <CheckCircle2 className="inline h-4 w-4 text-primary mr-1" /> : <AlertCircle className="inline h-4 w-4 text-amber-500 mr-1" />}
        {row.file.name}
      </div>
      <Select value={row.themeId ?? "__none__"} onValueChange={(v) => onChange({ themeId: v === "__none__" ? null : v })}>
        <SelectTrigger className="h-8"><SelectValue placeholder="— избери тема —" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— пропусни —</SelectItem>
          {themes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={row.type} onValueChange={(v) => onChange({ type: v as ResourceType })}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
      </Select>
      <div className={`text-xs text-center ${conf >= 70 ? "text-primary" : conf >= 45 ? "text-amber-600" : "text-muted-foreground"}`}>
        {conf > 0 ? `${conf}%` : "—"}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><X className="h-4 w-4" /></Button>
    </div>
  );
}
