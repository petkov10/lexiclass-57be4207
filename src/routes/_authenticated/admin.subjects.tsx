import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classesQuery, classSubjectsQuery, subjectsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"];

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  component: SubjectsAdmin,
});

function SubjectsAdmin() {
  const qc = useQueryClient();
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: classes } = useQuery(classesQuery);
  const { data: links } = useQuery(classSubjectsQuery);

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subjects"] });
    qc.invalidateQueries({ queryKey: ["class_subjects"] });
  };

  const add = async () => {
    if (!name.trim()) return;
    const order = (subjects?.length ?? 0) + 1;
    const { error } = await supabase.from("subjects").insert({ name: name.trim(), color, order_index: order });
    if (error) return toast.error(error.message);
    setName(""); refresh(); toast.success("Добавено");
  };

  const remove = async (id: string) => {
    if (!confirm("Да изтрия този предмет и всички ресурси към него?")) return;
    const { error } = await supabase.from("subjects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const save = async () => {
    if (!editId) return;
    const { error } = await supabase.from("subjects").update({ name: editName, color: editColor }).eq("id", editId);
    if (error) return toast.error(error.message);
    setEditId(null); refresh();
  };

  const toggleLink = async (subjectId: string, classId: string, on: boolean) => {
    if (on) {
      const { error } = await supabase.from("class_subjects").insert({ subject_id: subjectId, class_id: classId });
      if (error) return toast.error(error.message);
    } else {
      const link = links?.find((l) => l.subject_id === subjectId && l.class_id === classId);
      if (link) await supabase.from("class_subjects").delete().eq("id", link.id);
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Предмети</h1>
        <p className="text-sm text-muted-foreground mt-1">Добавете предмети и ги назначете към класове.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Име на предмет" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add}><Plus /> Добави</Button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Цвят:</span>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2 transition-all" style={{ background: c, borderColor: color === c ? "var(--ring)" : "transparent" }} />
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {(subjects ?? []).map((s) => {
          const linkedClassIds = new Set(links?.filter((l) => l.subject_id === s.id).map((l) => l.class_id));
          const isEditing = editId === s.id;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {isEditing ? (
                  <>
                    <div className="flex gap-1">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setEditColor(c)} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: editColor === c ? "var(--ring)" : "transparent" }} />
                      ))}
                    </div>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                    <Button size="sm" onClick={save}><Save /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X /></Button>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-md" style={{ background: s.color }} />
                    <div className="flex-1 font-medium">{s.name}</div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(s.id); setEditName(s.name); setEditColor(s.color); }}>Редактирай</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="text-destructive" /></Button>
                  </>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Преподава се в:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(classes ?? []).map((c) => {
                    const on = linkedClassIds.has(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 text-sm rounded-md border px-2 py-1 cursor-pointer hover:bg-accent">
                        <Checkbox checked={on} onCheckedChange={(v) => toggleLink(s.id, c.id, !!v)} />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
