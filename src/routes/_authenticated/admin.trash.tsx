import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { RotateCcw, Trash2, GraduationCap, BookOpen, ListTree, FileStack } from "lucide-react";
import { logActivity } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/trash")({
  component: TrashPage,
  head: () => ({
    meta: [
      { title: "Кошче — LexiClass" },
      { name: "description", content: "Възстановяване на изтрити класове, предмети, теми и ресурси." },
    ],
  }),
});

type Row = { id: string; name?: string; title?: string; deleted_at: string };

const trashQuery = {
  queryKey: ["trash"],
  queryFn: async () => {
    const [classes, subjects, themes, resources] = await Promise.all([
      supabase.from("classes").select("id, name, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("subjects").select("id, name, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("themes").select("id, name, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("resources").select("id, title, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    ]);
    return {
      classes: (classes.data ?? []) as Row[],
      subjects: (subjects.data ?? []) as Row[],
      themes: (themes.data ?? []) as Row[],
      resources: (resources.data ?? []) as Row[],
    };
  },
};

const DAYS = 30;

function daysLeft(deletedAt: string) {
  const ms = new Date(deletedAt).getTime() + DAYS * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function TrashPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(trashQuery);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["classes"] });
    qc.invalidateQueries({ queryKey: ["subjects"] });
    qc.invalidateQueries({ queryKey: ["themes-all"] });
    qc.invalidateQueries({ queryKey: ["resources"] });
  };

  const restore = async (table: "classes" | "subjects" | "themes" | "resources", id: string, label: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from(table).update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
      await logActivity("restore", { entity_type: table, entity_id: id, entity_label: label });
      toast.success("Възстановено");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const purge = async (table: "classes" | "subjects" | "themes" | "resources", id: string, label: string) => {
    if (!confirm(`Окончателно изтриване на „${label}“. Това е необратимо.`)) return;
    setBusy(true);
    try {
      let error: any = null;
      if (table === "classes") ({ error } = await supabase.rpc("admin_delete_class", { _id: id }));
      else if (table === "subjects") ({ error } = await supabase.rpc("admin_delete_subject", { _id: id }));
      else if (table === "themes") ({ error } = await supabase.rpc("admin_delete_theme", { _id: id }));
      else ({ error } = await supabase.from("resources").delete().eq("id", id));
      if (error) throw error;
      await logActivity("purge", { entity_type: table, entity_id: id, entity_label: label });
      toast.success("Изтрито окончателно");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const sections: Array<{
    key: "classes" | "subjects" | "themes" | "resources";
    title: string;
    icon: typeof GraduationCap;
    rows: Row[];
  }> = [
    { key: "classes", title: "Класове", icon: GraduationCap, rows: data?.classes ?? [] },
    { key: "subjects", title: "Предмети", icon: BookOpen, rows: data?.subjects ?? [] },
    { key: "themes", title: "Теми", icon: ListTree, rows: data?.themes ?? [] },
    { key: "resources", title: "Ресурси", icon: FileStack, rows: data?.resources ?? [] },
  ];

  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Кошче</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Изтритите елементи се пазят {DAYS} дни и могат да бъдат възстановени. Окончателното изтриване е необратимо.
        </p>
      </div>

      {isLoading && <Card className="p-6 text-sm text-muted-foreground">Зареждане…</Card>}
      {!isLoading && total === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">Кошчето е празно.</Card>
      )}

      {sections.filter((s) => s.rows.length > 0).map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.key} className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-primary" /> {s.title}
              <span className="text-xs text-muted-foreground font-normal">({s.rows.length})</span>
            </h2>
            <div className="divide-y">
              {s.rows.map((r) => {
                const label = r.name || r.title || "—";
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="text-sm font-medium truncate min-w-0 flex-1">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      остават {daysLeft(r.deleted_at)} дни
                    </span>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => restore(s.key, r.id, label)}>
                      <RotateCcw className="h-4 w-4" /> Възстанови
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy}
                      onClick={() => purge(s.key, r.id, label)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
