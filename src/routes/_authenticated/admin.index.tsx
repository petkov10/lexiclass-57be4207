import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, ListTree, FileStack, ArrowRight, HardDrive, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getStorageStats } from "@/lib/storage-stats.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function Dashboard() {
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes } = useQuery(allThemesQuery);
  const [resCount, setResCount] = useState<number | null>(null);
  const fetchStats = useServerFn(getStorageStats);
  const { data: storage, isLoading: storageLoading } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: () => fetchStats({}),
    staleTime: 5 * 60 * 1000,
  });

  const [backupAge, setBackupAge] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("resources").select("*", { count: "exact", head: true }).then(({ count }) => setResCount(count ?? 0));
    const raw = localStorage.getItem("lexiclass:last-backup");
    const ts = raw ? Number(raw) : 0;
    setBackupAge(ts ? Math.floor((Date.now() - ts) / 86400000) : -1);
  }, []);


  const stats = [
    { label: "Класове", value: classes?.length ?? 0, icon: GraduationCap, to: "/admin/classes" as const },
    { label: "Предмети", value: subjects?.length ?? 0, icon: BookOpen, to: "/admin/subjects" as const },
    { label: "Теми", value: themes?.length ?? 0, icon: ListTree, to: "/admin/themes" as const },
    { label: "Ресурси", value: resCount ?? 0, icon: FileStack, to: "/admin/resources" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Табло</h1>
        <p className="text-sm text-muted-foreground mt-1">Обзор на учебното съдържание</p>
      </div>

      {backupAge !== null && (backupAge < 0 || backupAge >= 7) && (
        <Link to="/admin/backup" className="block">
          <Card className="p-4 border-amber-500/40 bg-amber-500/10 flex items-center gap-3 hover-lift">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium">
                {backupAge < 0 ? "Още не е правен архив" : `Последният архив е отпреди ${backupAge} дни`}
              </div>
              <div className="text-muted-foreground">Направете „Пълен архив“ и го качете в Google Drive/OneDrive.</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="hover-lift">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <s.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">Хранилище</h2>
            <p className="text-xs text-muted-foreground">Размер на качените файлове по кофи.</p>
          </div>
        </div>
        {storageLoading ? (
          <div className="h-16 bg-muted rounded animate-pulse" />
        ) : storage ? (
          <div className="space-y-2">
            <div className="text-2xl font-semibold">{formatBytes(storage.totalBytes)} <span className="text-sm font-normal text-muted-foreground">· {storage.totalFiles} файла</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {storage.buckets.map((b) => (
                <div key={b.bucket} className="rounded border p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.bucket}</div>
                    <div className="font-medium">{formatBytes(b.bytes)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{b.files} файла</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Няма данни.</p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Бързи действия</h2>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>• Добавете или редактирайте класове и предмети.</li>
          <li>• Създайте тематично разпределение (ръчно или от Excel).</li>
          <li>• Качете ресурси — презентации, документи, видеа, задачи и код.</li>
          <li>• Използвайте AI асистента, за да генерирате задачи и тестове.</li>
          <li>• Направете бекъп преди големи промени.</li>
        </ul>
      </Card>
    </div>
  );
}
