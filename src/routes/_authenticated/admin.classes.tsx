import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/classes")({
  component: ClassesAdmin,
});

function ClassesAdmin() {
  const qc = useQueryClient();
  const { data: classes } = useQuery(classesQuery);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["classes"] });

  const add = async () => {
    if (!newName.trim()) return;
    const order = (classes?.length ?? 0) + 1;
    const { error } = await supabase.from("classes").insert({ name: newName.trim(), order_index: order });
    if (error) return toast.error(error.message);
    setNewName(""); refresh(); toast.success("Класът е добавен");
  };

  const remove = async (id: string) => {
    if (!confirm("Сигурни ли сте? Това ще изтрие всички теми и ресурси към този клас.")) return;
    const { error } = await supabase.from("classes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh(); toast.success("Изтрито");
  };

  const save = async () => {
    if (!editId) return;
    const { error } = await supabase.from("classes").update({ name: editName }).eq("id", editId);
    if (error) return toast.error(error.message);
    setEditId(null); refresh();
  };

  const seedDefaults = async () => {
    const existing = new Set(classes?.map((c) => c.name));
    const rows = Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1} клас`, order_index: i + 1 }))
      .filter((r) => !existing.has(r.name));
    if (!rows.length) return toast.info("Класовете 1–12 вече съществуват");
    const { error } = await supabase.from("classes").insert(rows);
    if (error) return toast.error(error.message);
    refresh(); toast.success("Добавени");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Класове</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление на класовете в системата.</p>
        </div>
        <Button variant="outline" onClick={seedDefaults}><RotateCcw /> Добави 1–12</Button>
      </div>

      <Card className="p-4 flex gap-2">
        <Input placeholder="Име на клас (напр. 8А, Програмиране 11)" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus /> Добави</Button>
      </Card>

      <Card className="divide-y">
        {(classes ?? []).map((c) => (
          <div key={c.id} className="p-3 flex items-center gap-2">
            {editId === c.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={save}><Save /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-medium">{c.name}</div>
                <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setEditName(c.name); }}>Редактирай</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="text-destructive" /></Button>
              </>
            )}
          </div>
        ))}
        {(!classes || classes.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">Все още няма класове.</div>}
      </Card>
    </div>
  );
}
