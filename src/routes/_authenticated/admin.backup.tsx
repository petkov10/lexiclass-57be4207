import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TABLES = ["classes", "subjects", "class_subjects", "themes", "resources", "app_settings"] as const;

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
});

function BackupPage() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const exportData = async () => {
    setLoading(true);
    try {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        if (error) throw error;
        out[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), data: out }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eduhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Бекъпът е готов");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const importData = async (file: File) => {
    if (!confirm("Това ще ИЗТРИЕ всички съществуващи данни и ще ги замени с тези от файла. Сигурни ли сте?")) return;
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed.data || parsed;
      // Delete in dependency order
      await supabase.from("resources").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("themes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("class_subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Insert in dependency order
      for (const t of ["classes", "subjects", "class_subjects", "themes", "resources"] as const) {
        if (data[t]?.length) {
          const { error } = await supabase.from(t).insert(data[t]);
          if (error) throw error;
        }
      }
      if (data.app_settings?.[0]) {
        const s = data.app_settings[0];
        await supabase.from("app_settings").update({
          site_name: s.site_name, logo_text: s.logo_text, logo_url: s.logo_url,
          color_scheme: s.color_scheme, theme_mode: s.theme_mode, extra: s.extra,
        }).eq("id", 1);
      }
      qc.invalidateQueries();
      toast.success("Възстановяването завърши успешно");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Бекъп и възстановяване</h1>
        <p className="text-sm text-muted-foreground mt-1">Архивирайте всичките си данни или ги възстановете от файл.</p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Експорт</h2>
        <p className="text-sm text-muted-foreground">Сваля JSON файл с всички класове, предмети, теми, ресурси и настройки. (Файловете в облака се пазят отделно.)</p>
        <Button onClick={exportData} disabled={loading}><Download /> Свали бекъп</Button>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Импорт</h2>
        <p className="text-sm text-muted-foreground">Внимание: импортирането ще ЗАМЕНИ всички текущи данни.</p>
        <label className="inline-block">
          <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); }} />
          <Button asChild disabled={loading}><span><Upload /> Избери бекъп файл</span></Button>
        </label>
      </Card>
    </div>
  );
}
