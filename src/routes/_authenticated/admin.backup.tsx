import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, AlertTriangle, RefreshCw, HardDrive, Cloud, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getStorageStats } from "@/lib/storage-stats.functions";
import { useServerFn } from "@tanstack/react-start";

/** Таблици в реда, в който могат да се вмъкват без нарушени връзки. */
const TABLES = [
  "app_settings",
  "classes",
  "subjects",
  "class_subjects",
  "themes",
  "resources",
  "test_content",
  "theme_private_notes",
  "homework",
  "schedules",
] as const;

/** Таблици, които се изчистват при възстановяване (обратен ред на зависимостите). */
const CLEARABLE = [
  "theme_private_notes",
  "test_content",
  "homework",
  "resources",
  "schedules",
  "themes",
  "class_subjects",
  "subjects",
  "classes",
] as const;

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
});

function formatBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

async function listAllFiles(bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if ((item as any).id == null) {
      out.push(...(await listAllFiles(bucket, path)));
    } else {
      out.push(path);
    }
  }
  return out;
}

function BackupPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const [pct, setPct] = useState(0);
  const statsFn = useServerFn(getStorageStats);
  const { data: stats } = useQuery<any>({ queryKey: ["storage-stats"], queryFn: () => (statsFn as any)({}) });

  const exportAll = async (withFiles: boolean) => {
    setBusy(withFiles ? "Подготвяне на пълен архив..." : "Подготвяне на данните...");
    setPct(0);
    try {
      const data: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const { data: rows, error } = await supabase.from(t).select("*");
        if (error) throw error;
        data[t] = rows ?? [];
      }
      const zip = new JSZip();
      zip.file("data.json", JSON.stringify({ version: 2, exported_at: new Date().toISOString(), data }, null, 2));

      if (withFiles) {
        for (const bucket of ["resources", "branding"]) {
          let files: string[] = [];
          try { files = await listAllFiles(bucket); } catch { files = []; }
          for (let i = 0; i < files.length; i++) {
            setBusy(`Сваляне на файлове (${bucket}): ${i + 1}/${files.length}`);
            setPct(Math.round(((i + 1) / Math.max(files.length, 1)) * 100));
            const { data: blob, error } = await supabase.storage.from(bucket).download(files[i]);
            if (error || !blob) continue;
            zip.file(`files/${bucket}/${files[i]}`, blob);
          }
        }
      }

      setBusy("Създаване на архива...");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lexiclass-${withFiles ? "full" : "data"}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Архивът е свален. Качете го в Google Drive/OneDrive за съхранение.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy("");
      setPct(0);
    }
  };

  const importArchive = async (file: File) => {
    if (!confirm("Възстановяването ЗАМЕНЯ всички текущи класове, предмети, теми и ресурси. Продължавате ли?")) return;
    setBusy("Прочитане на архива...");
    setPct(0);
    try {
      let json: any;
      let zip: JSZip | null = null;
      if (file.name.endsWith(".zip")) {
        zip = await JSZip.loadAsync(file);
        const df = zip.file("data.json");
        if (!df) throw new Error("Архивът не съдържа data.json");
        json = JSON.parse(await df.async("string"));
      } else {
        json = JSON.parse(await file.text());
      }
      const data = json.data || json;

      setBusy("Изчистване на старите данни...");
      for (const t of CLEARABLE) {
        const q: any = supabase.from(t as any);
        const { error } = await q.delete().not("updated_at", "is", null);
        if (error) {
          const q2: any = supabase.from(t as any);
          const { error: e2 } = await q2.delete().not("created_at", "is", null);
          if (e2) throw new Error(`${t}: ${e2.message}`);
        }
      }

      for (const t of TABLES) {
        const rows = data[t];
        if (!rows?.length) continue;
        setBusy(`Възстановяване: ${t}`);
        if (t === "app_settings") {
          const s = { ...rows[0] };
          delete s.id;
          await supabase.from("app_settings").update(s).eq("id", 1);
          continue;
        }
        const q: any = supabase.from(t as any);
        const { error } = await q.insert(rows);
        if (error) throw new Error(`${t}: ${error.message}`);
      }

      if (zip) {
        const entries = Object.keys(zip.files).filter((k) => k.startsWith("files/") && !zip!.files[k].dir);
        for (let i = 0; i < entries.length; i++) {
          setBusy(`Качване на файлове: ${i + 1}/${entries.length}`);
          setPct(Math.round(((i + 1) / entries.length) * 100));
          const rel = entries[i].slice("files/".length);
          const slash = rel.indexOf("/");
          const bucket = rel.slice(0, slash);
          const path = rel.slice(slash + 1);
          const blob = await zip.files[entries[i]].async("blob");
          await supabase.storage.from(bucket).upload(path, blob, { upsert: true });
        }
      }

      qc.invalidateQueries();
      toast.success("Възстановяването завърши успешно");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy("");
      setPct(0);
    }
  };

  const applyUpdate = async () => {
    setBusy("Прилагане на обновленията...");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) { try { await r.unregister(); } catch { /* ignore */ } }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      toast.success("Готово — страницата ще се презареди");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e.message);
      setBusy("");
    }
  };

  const used = stats?.totalBytes ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Миграция, архив и обновяване</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Всичко за преместване на сайта, съхранение на данните и прилагане на обновления — с по един бутон.
        </p>
      </div>

      {busy && (
        <Card className="p-4 space-y-2 border-primary/40">
          <div className="text-sm font-medium">{busy}</div>
          {pct > 0 && <Progress value={pct} />}
        </Card>
      )}

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><FileArchive className="h-4 w-4 text-primary" /> 1. Направете архив</h2>
        <p className="text-sm text-muted-foreground">
          <b>Пълен архив</b> = всички данни (класове, предмети, теми, ресурси, домашни, разписание, тестове, настройки)
          <b> + всички качени файлове</b> в един .zip. Същият файл се използва и за преместване на сайта.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportAll(true)} disabled={!!busy}><Download /> Пълен архив (данни + файлове)</Button>
          <Button variant="outline" onClick={() => exportAll(false)} disabled={!!busy}><Download /> Само данни (малък файл)</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> 2. Възстановяване / Миграция</h2>
        <p className="text-sm text-muted-foreground">
          Изберете архивен .zip (или стар .json) файл. Данните и файловете се възстановяват в този сайт.
          <br /><b>Внимание:</b> текущото съдържание се заменя.
        </p>
        <label className="inline-block">
          <input type="file" accept=".zip,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importArchive(f); e.currentTarget.value = ""; }} />
          <Button asChild disabled={!!busy}><span><Upload /> Избери архивен файл</span></Button>
        </label>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> 3. Приложи обновления</h2>
        <p className="text-sm text-muted-foreground">
          Ако не виждате най-новата версия на сайта (стари екрани, липсващи бутони), натиснете тук — изчиства се локалният
          кеш на устройството и се зарежда актуалната версия.
        </p>
        <Button variant="outline" onClick={applyUpdate} disabled={!!busy}><RefreshCw /> Обнови сега</Button>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><HardDrive className="h-4 w-4 text-primary" /> 4. Заето пространство</h2>
        <p className="text-sm">
          Използвани <b>{formatBytes(used)}</b>{stats?.fileCount ? ` в ${stats.fileCount} файла` : ""}.
        </p>
        <div className="rounded-lg border p-3 text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2 font-medium text-foreground"><Cloud className="h-4 w-4" /> Как да пестите място</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Качвайте големи видеа в YouTube/Google Drive/OneDrive и ги добавяйте като ресурс от тип <b>Линк</b> или <b>Видео</b>.</li>
            <li>Големи презентации и архиви споделяйте през Drive/OneDrive — линкът се отваря директно в темата.</li>
            <li>Правете „Пълен архив“ веднъж месечно и го качвайте в Drive/OneDrive — така имате втори независим запис.</li>
            <li>Изтривайте стари ресурси от „Ресурси“ с груповото маркиране.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
