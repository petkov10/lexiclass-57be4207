import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersWithRolesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Trash2, UserPlus, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

type RoleVal = "admin" | "editor" | "user";

function UsersAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole(user?.id);
  const { data } = useQuery(usersWithRolesQuery);

  const [email, setEmail] = useState("");
  const [role, setRoleVal] = useState<RoleVal>("editor");
  const [busy, setBusy] = useState(false);

  if (!roleLoading && !isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">Само администратор има достъп до тази страница.</div>;
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["users-roles"] });

  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("pending_invites").upsert({ email: e, role, invited_by: user?.id }, { onConflict: "email" });
      if (error) throw error;
      toast.success("Поканата е създадена. Потребителят ще получи ролята при регистрация със същия имейл.");
      setEmail("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeInvite = async (id: string) => {
    await supabase.from("pending_invites").delete().eq("id", id);
    refresh();
  };

  const setUserRole = async (userId: string, newRole: RoleVal) => {
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
      toast.success("Ролята е обновена");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const roleOf = (uid: string): RoleVal => {
    const r = data?.roles.find((x) => x.user_id === uid);
    return (r?.role as RoleVal) ?? "user";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Потребители и покани</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Поканете други учители — те ще се регистрират с този имейл и автоматично ще получат ролята.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Нова покана</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRoleVal(v as RoleVal)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Редактор (съдържание)</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={busy || !email.trim()}><Mail /> Покани</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Редактор</strong> може да управлява класове, предмети, теми, ресурси и AI. Няма достъп до настройки, потребители и бекъп.
        </p>
      </Card>

      {(data?.invites?.length ?? 0) > 0 && (
        <Card>
          <div className="px-4 py-3 border-b font-medium text-sm">Изчакващи покани</div>
          <div className="divide-y">
            {data?.invites.map((inv) => (
              <div key={inv.id} className="p-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0 font-medium truncate">{inv.email}</div>
                <span className="text-xs uppercase tracking-wider rounded bg-muted px-2 py-1">{inv.role}</span>
                <Button size="sm" variant="ghost" onClick={() => removeInvite(inv.id)}><Trash2 className="text-destructive" /></Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-4 py-3 border-b font-medium text-sm">Регистрирани потребители</div>
        <div className="divide-y">
          {data?.profiles.map((p) => {
            const r = roleOf(p.id);
            const Icon = r === "admin" ? ShieldCheck : r === "editor" ? Shield : UserIcon;
            const isMe = p.id === user?.id;
            return (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.display_name ?? "—"} {isMe && <span className="text-xs text-muted-foreground">(вие)</span>}</div>
                </div>
                <Select value={r} onValueChange={(v) => setUserRole(p.id, v as RoleVal)} disabled={isMe}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Само четене</SelectItem>
                    <SelectItem value="editor">Редактор</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          {(!data?.profiles || data.profiles.length === 0) && (
            <div className="p-6 text-sm text-muted-foreground text-center">Няма регистрирани потребители.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
