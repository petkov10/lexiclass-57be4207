import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersWithRolesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Trash2, UserPlus, Shield, ShieldCheck, User as UserIcon, Eye, EyeOff, Copy, RefreshCw, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

type RoleVal = "admin" | "editor" | "user";
type PinRow = { user_id: string; access_pin: string | null; is_paused: boolean; is_approved: boolean; last_login_at: string | null };

function UsersAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole(user?.id);
  const { data } = useQuery(usersWithRolesQuery);
  const [pinRows, setPinRows] = useState<Record<string, PinRow>>({});
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [editName, setEditName] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [role, setRoleVal] = useState<RoleVal>("user");
  const [busy, setBusy] = useState(false);

  const loadPins = async () => {
    const { data: rows } = await supabase.rpc("admin_list_user_pins");
    const map: Record<string, PinRow> = {};
    (rows ?? []).forEach((r: any) => { map[r.user_id] = r; });
    setPinRows(map);
  };

  useEffect(() => { if (isAdmin) loadPins(); }, [isAdmin, data?.profiles.length]);

  if (!roleLoading && !isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">Само администратор има достъп до тази страница.</div>;
  }

  const refresh = () => { qc.invalidateQueries({ queryKey: ["users-roles"] }); loadPins(); };

  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("pending_invites").upsert({ email: e, role, invited_by: user?.id }, { onConflict: "email" });
      if (error) throw error;
      toast.success("Поканата е създадена.");
      setEmail("");
      refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
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
    } catch (err: any) { toast.error(err.message); }
  };

  const roleOf = (uid: string): RoleVal => {
    const r = data?.roles.find((x) => x.user_id === uid);
    return (r?.role as RoleVal) ?? "user";
  };

  const updatePin = async (userId: string, pin: string | null) => {
    const v = pin && /^\d{4}$/.test(pin) ? pin : pin === null || pin === "" ? null : null;
    if (pin && !v) { toast.error("PIN трябва да е 4 цифри"); return; }
    const { error } = await supabase.rpc("admin_set_user_pin", { _user_id: userId, _pin: v as any });
    if (error) { toast.error(error.message); return; }
    toast.success(v ? "PIN е запазен" : "PIN е премахнат");
    loadPins();
  };

  const togglePause = async (userId: string, paused: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_paused", { _user_id: userId, _paused: paused });
    if (error) { toast.error(error.message); return; }
    loadPins();
  };

  const toggleApproved = async (userId: string, approved: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_approved", { _user_id: userId, _approved: approved });
    if (error) { toast.error(error.message); return; }
    toast.success(approved ? "Потребителят е одобрен" : "Одобрението е премахнато");
    loadPins();
  };

  const renameUser = async (userId: string, name: string) => {
    const { error } = await supabase.rpc("admin_set_user_display_name", { _user_id: userId, _name: name });
    if (error) { toast.error(error.message); return; }
    toast.success("Името е обновено");
    setEditName((p) => { const n = { ...p }; delete n[userId]; return n; });
    refresh();
  };

  const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Потребители и достъп</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управление на роли, PIN-кодове и временна пауза. <strong>Администратор</strong> — пълен достъп; <strong>Редактор</strong> — съдържание; <strong>Потребител</strong> — ученик (само гледа ресурсите).
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Покани нов</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRoleVal(v as RoleVal)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Потребител (ученик)</SelectItem>
              <SelectItem value="editor">Редактор</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={busy || !email.trim()}><Mail /> Покани</Button>
        </div>
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
        <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
          <span>Регистрирани потребители</span>
          <Button size="sm" variant="ghost" onClick={() => window.print()}>Печат на PIN-ове</Button>
        </div>
        <div className="divide-y">
          {data?.profiles.map((p) => {
            const r = roleOf(p.id);
            const Icon = r === "admin" ? ShieldCheck : r === "editor" ? Shield : UserIcon;
            const isMe = p.id === user?.id;
            const pinRow = pinRows[p.id];
            const pin = pinRow?.access_pin ?? "";
            const paused = pinRow?.is_paused ?? false;
            const editing = editName[p.id] !== undefined;
            const approved = pinRow?.is_approved ?? true;
            return (
              <div key={p.id} className={`p-3 grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center ${paused || !approved ? "opacity-60" : ""}`}>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <Input value={editName[p.id]} onChange={(e) => setEditName((s) => ({ ...s, [p.id]: e.target.value }))} className="h-8" />
                      <Button size="sm" variant="ghost" onClick={() => renameUser(p.id, editName[p.id])}><Check /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditName((s) => { const n = { ...s }; delete n[p.id]; return n; })}><X /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{p.display_name ?? "—"} {isMe && <span className="text-xs text-muted-foreground">(вие)</span>}</div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditName((s) => ({ ...s, [p.id]: p.display_name ?? "" }))}><Pencil className="h-3 w-3" /></Button>
                    </div>
                  )}
                  {pinRow?.last_login_at && (
                    <div className="text-xs text-muted-foreground">Последен вход: {new Date(pinRow.last_login_at).toLocaleString("bg-BG")}</div>
                  )}
                </div>

                {/* PIN */}
                <div className="flex items-center gap-1">
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="PIN"
                    value={showPin[p.id] ? pin : pin ? "••••" : ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPinRows((s) => ({ ...s, [p.id]: { ...(s[p.id] || { user_id: p.id, is_paused: false, last_login_at: null, access_pin: null }), access_pin: v } }));
                      setShowPin((s) => ({ ...s, [p.id]: true }));
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length === 4 || v.length === 0) updatePin(p.id, v || null);
                    }}
                    className="h-8 w-24 text-center font-mono tracking-widest"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowPin((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                    {showPin[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Генерирай"
                    onClick={() => { const np = genPin(); setShowPin((s) => ({ ...s, [p.id]: true })); updatePin(p.id, np); }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {pin && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Копирай"
                      onClick={() => { navigator.clipboard.writeText(pin); toast.success("Копиран"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Pause toggle */}
                <div className="flex items-center gap-2">
                  <Switch checked={!paused} disabled={isMe} onCheckedChange={(v) => togglePause(p.id, !v)} />
                  <span className="text-xs text-muted-foreground">{paused ? "На пауза" : "Активен"}</span>
                </div>

                {/* Role */}
                <Select value={r} onValueChange={(v) => setUserRole(p.id, v as RoleVal)} disabled={isMe}>
                  <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Потребител</SelectItem>
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
