import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery, classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const SCHEMES = [
  { v: "blue", label: "Синя", color: "linear-gradient(135deg,#3b82f6,#a855f7)" },
  { v: "emerald", label: "Зелена", color: "linear-gradient(135deg,#10b981,#22d3ee)" },
  { v: "violet", label: "Виолетова", color: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
  { v: "rose", label: "Розова", color: "linear-gradient(135deg,#f43f5e,#f59e0b)" },
  { v: "amber", label: "Жълто-оранжева", color: "linear-gradient(135deg,#f59e0b,#facc15)" },
  { v: "slate", label: "Графитена", color: "linear-gradient(135deg,#475569,#94a3b8)" },
  { v: "sunset", label: "Sunset Blaze", color: "linear-gradient(135deg,#ff6b35,#e84393)" },
  { v: "mint", label: "Neon Mint", color: "linear-gradient(135deg,#2dd4a8,#73ffb8)" },
  { v: "vapor", label: "Vapor Chrome", color: "linear-gradient(135deg,#818cf8,#67e8f9)" },
  { v: "coral", label: "Electric Coral", color: "linear-gradient(135deg,#ff6b6b,#c44569)" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [form, setForm] = useState({
    site_name: "", logo_text: "", logo_url: "", color_scheme: "blue", theme_mode: "light",
  });
  const [scale, setScale] = useState<{ min_percent: number; grade: number }[]>([
    { min_percent: 90, grade: 6 }, { min_percent: 75, grade: 5 },
    { min_percent: 60, grade: 4 }, { min_percent: 45, grade: 3 }, { min_percent: 0, grade: 2 },
  ]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [accessMode, setAccessMode] = useState<"free" | "global_pin" | "user_pin">("free");
  const [globalPin, setGlobalPin] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        site_name: data.site_name || "",
        logo_text: data.logo_text || "",
        logo_url: data.logo_url || "",
        color_scheme: data.color_scheme || "blue",
        theme_mode: data.theme_mode || "light",
      });
      const gs = (data as any).grading_scale;
      if (Array.isArray(gs) && gs.length > 0) setScale(gs);
      setAccessMode(((data as any).access_mode as any) || "free");
      setGlobalPin((data as any).global_pin || "");
    }
  }, [data]);

  const saveAccess = async () => {
    if (accessMode === "global_pin" && !/^\d{4}$/.test(globalPin)) {
      toast.error("PIN трябва да е 4 цифри"); return;
    }
    setSavingAccess(true);
    try {
      const { error } = await supabase.rpc("admin_set_access", {
        _mode: accessMode,
        _global_pin: accessMode === "global_pin" ? globalPin : (null as any),
      });
      if (error) throw error;
      toast.success("Достъпът е обновен");
      qc.invalidateQueries({ queryKey: ["app_settings"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingAccess(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      let logo_url = form.logo_url;
      if (logoFile) {
        const path = `logo_${Date.now()}_${sanitizeFileName(logoFile.name)}`;
        const { error: upErr } = await supabase.storage.from("branding").upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
        logo_url = pub.publicUrl;
      }
      const sortedScale = [...scale].sort((a, b) => b.min_percent - a.min_percent);
      const { error } = await supabase.from("app_settings").update({ ...form, logo_url, grading_scale: sortedScale as any }).eq("id", 1);
      if (error) throw error;
      toast.success("Запазено");
      qc.invalidateQueries({ queryKey: ["app_settings"] });
      setLogoFile(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-1">Управление на външния вид и брандирането.</p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Брандиране</h2>
        <div><Label>Име на сайта</Label><Input value={form.site_name} onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))} /></div>
        <div><Label>Текстово лого (видимо до иконата)</Label><Input value={form.logo_text} onChange={(e) => setForm((f) => ({ ...f, logo_text: e.target.value }))} placeholder="Празно = името на сайта" /></div>
        <div className="space-y-2">
          <Label>Лого изображение</Label>
          {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 rounded" />}
          <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Тема и цветова схема</h2>
        <div>
          <Label>Режим</Label>
          <Select value={form.theme_mode} onValueChange={(v) => setForm((f) => ({ ...f, theme_mode: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Светъл</SelectItem>
              <SelectItem value="dark">Тъмен</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Цветова схема</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {SCHEMES.map((s) => {
              const active = form.color_scheme === s.v;
              return (
                <button key={s.v} type="button" onClick={() => setForm((f) => ({ ...f, color_scheme: s.v }))}
                  className="group flex items-center gap-3 rounded-xl border-2 p-3 hover:bg-accent transition-all text-left"
                  style={{ borderColor: active ? "var(--ring)" : "var(--border)" }}>
                  <div className="h-9 w-9 rounded-lg shrink-0 shadow-sm" style={{ background: s.color }} />
                  <span className="text-sm font-medium">{s.label}</span>
                  {active && <span className="ml-auto text-xs text-primary">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Скала за оценяване</h2>
          <p className="text-xs text-muted-foreground mt-1">Праг (%) → оценка. Използва се при автоматичното оценяване на тестове.</p>
        </div>
        <div className="space-y-2">
          {scale.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <div>
                <Label className="text-xs">Над (%)</Label>
                <Input type="number" min={0} max={100} value={row.min_percent}
                  onChange={(e) => setScale((p) => p.map((r, j) => j === i ? { ...r, min_percent: Math.max(0, Math.min(100, +e.target.value || 0)) } : r))} />
              </div>
              <div>
                <Label className="text-xs">Оценка</Label>
                <Input type="number" min={2} max={6} step={0.01} value={row.grade}
                  onChange={(e) => setScale((p) => p.map((r, j) => j === i ? { ...r, grade: +e.target.value || 2 } : r))} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setScale((p) => p.filter((_, j) => j !== i))} className="mt-5">✕</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setScale((p) => [...p, { min_percent: 0, grade: 2 }])}>+ Добави праг</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Достъп до сайта</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Изберете кой може да отваря публичните страници. Администратори и редактори винаги имат достъп.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {[
            { v: "free", label: "Свободен", desc: "Без PIN" },
            { v: "global_pin", label: "Общ PIN", desc: "Един код за всички" },
            { v: "user_pin", label: "Личен PIN", desc: "Код за всеки ученик" },
          ].map((opt) => {
            const active = accessMode === (opt.v as any);
            return (
              <button key={opt.v} type="button" onClick={() => setAccessMode(opt.v as any)}
                className="rounded-xl border-2 p-3 text-left hover:bg-accent transition-all"
                style={{ borderColor: active ? "var(--ring)" : "var(--border)" }}>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            );
          })}
        </div>
        {accessMode === "global_pin" && (
          <div className="max-w-xs">
            <Label>Общ PIN (4 цифри)</Label>
            <Input inputMode="numeric" maxLength={4} value={globalPin}
              onChange={(e) => setGlobalPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••" />
          </div>
        )}
        {accessMode === "user_pin" && (
          <p className="text-xs text-muted-foreground">PIN-овете се управляват в <strong>Потребители</strong>.</p>
        )}
        <Button onClick={saveAccess} disabled={savingAccess} variant="secondary">
          {savingAccess ? "Запазване…" : "Запази достъпа"}
        </Button>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? "Запазване..." : "Запази настройките"}</Button>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const qc = useQueryClient();
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes } = useQuery(allThemesQuery);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [themeId, setThemeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["classes"] });
    qc.invalidateQueries({ queryKey: ["subjects"] });
    qc.invalidateQueries({ queryKey: ["themes-all"] });
    qc.invalidateQueries({ queryKey: ["class_subjects"] });
  };

  const run = async (label: string, fn: () => Promise<{ error: any }>) => {
    if (!confirm(`Сигурен ли си? ${label}\n\nТова е необратимо.`)) return;
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      toast.success("Изтрито");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-6 space-y-5 border-destructive/40">
      <div>
        <h2 className="font-semibold text-destructive">Опасна зона</h2>
        <p className="text-xs text-muted-foreground mt-1">Каскадно изтриване — премахва избрания елемент заедно с всички теми, ресурси, домашни и програма.</p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Изтрий клас със всичко в него" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="destructive" disabled={!classId || busy}
            onClick={() => run(`Изтриване на клас със всички предмети, теми и ресурси.`,
              async () => { const { error } = await supabase.rpc("admin_delete_class", { _id: classId }); return { error }; })}>
            Изтрий клас
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Изтрий предмет със всичко в него" /></SelectTrigger>
            <SelectContent>{subjects?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="destructive" disabled={!subjectId || busy}
            onClick={() => run(`Изтриване на предмет със всички теми и ресурси (във всички класове).`,
              async () => { const { error } = await supabase.rpc("admin_delete_subject", { _id: subjectId }); return { error }; })}>
            Изтрий предмет
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <Select value={themeId} onValueChange={setThemeId}>
            <SelectTrigger><SelectValue placeholder="Изтрий тема със всички ресурси" /></SelectTrigger>
            <SelectContent>{themes?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="destructive" disabled={!themeId || busy}
            onClick={() => run(`Изтриване на тема със всички ресурси и домашни.`,
              async () => { const { error } = await supabase.rpc("admin_delete_theme", { _id: themeId }); return { error }; })}>
            Изтрий тема
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-destructive/30 space-y-2">
        <Label className="text-destructive">Нулиране на цялото съдържание</Label>
        <p className="text-xs text-muted-foreground">Изтрива ВСИЧКИ класове, предмети, теми, ресурси, тестови резултати, домашни и програма. Потребителите и настройките остават.</p>
        <p className="text-xs text-muted-foreground">Напиши <code className="bg-muted px-1 rounded">ИЗТРИЙ ВСИЧКО</code> за потвърждение:</p>
        <div className="flex gap-2">
          <Input value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} placeholder="ИЗТРИЙ ВСИЧКО" />
          <Button variant="destructive" disabled={resetConfirm !== "ИЗТРИЙ ВСИЧКО" || busy}
            onClick={async () => {
              if (!confirm("Последно потвърждение: всички класове, предмети, теми и ресурси ще бъдат изтрити необратимо.")) return;
              setBusy(true);
              try {
                const { error } = await supabase.rpc("admin_reset_all");
                if (error) throw error;
                toast.success("Всичко е изтрито.");
                setResetConfirm("");
                refresh();
              } catch (e: any) { toast.error(e.message); }
              finally { setBusy(false); }
            }}>
            Нулирай всичко
          </Button>
        </div>
      </div>
    </Card>
  );
}
