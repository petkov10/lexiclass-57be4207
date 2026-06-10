import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
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
  { v: "blue", label: "Синя", color: "#3b82f6" },
  { v: "emerald", label: "Зелена", color: "#10b981" },
  { v: "violet", label: "Виолетова", color: "#8b5cf6" },
  { v: "rose", label: "Розова", color: "#f43f5e" },
  { v: "amber", label: "Жълто-оранжева", color: "#f59e0b" },
  { v: "slate", label: "Графитена", color: "#475569" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [form, setForm] = useState({
    site_name: "", logo_text: "", logo_url: "", color_scheme: "blue", theme_mode: "light",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({
      site_name: data.site_name || "",
      logo_text: data.logo_text || "",
      logo_url: data.logo_url || "",
      color_scheme: data.color_scheme || "blue",
      theme_mode: data.theme_mode || "light",
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      let logo_url = form.logo_url;
      if (logoFile) {
        const path = `logo_${Date.now()}_${logoFile.name}`;
        const { error: upErr } = await supabase.storage.from("branding").upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
        logo_url = pub.publicUrl;
      }
      const { error } = await supabase.from("app_settings").update({ ...form, logo_url }).eq("id", 1);
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
          <div className="grid grid-cols-3 gap-2 mt-2">
            {SCHEMES.map((s) => (
              <button key={s.v} onClick={() => setForm((f) => ({ ...f, color_scheme: s.v }))}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-accent"
                style={{ borderColor: form.color_scheme === s.v ? "var(--ring)" : undefined, borderWidth: form.color_scheme === s.v ? 2 : 1 }}>
                <div className="h-5 w-5 rounded-full" style={{ background: s.color }} />
                <span className="text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? "Запазване..." : "Запази настройките"}</Button>
    </div>
  );
}
