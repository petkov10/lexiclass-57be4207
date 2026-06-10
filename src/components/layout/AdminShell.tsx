import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  ListTree,
  FileStack,
  Sparkles,
  Settings as SettingsIcon,
  DatabaseBackup,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin", label: "Табло", icon: LayoutDashboard, exact: true },
  { to: "/admin/classes", label: "Класове", icon: GraduationCap },
  { to: "/admin/subjects", label: "Предмети", icon: BookOpen },
  { to: "/admin/themes", label: "Теми", icon: ListTree },
  { to: "/admin/resources", label: "Ресурси", icon: FileStack },
  { to: "/admin/ai", label: "AI Асистент", icon: Sparkles },
  { to: "/admin/settings", label: "Настройки", icon: SettingsIcon },
  { to: "/admin/backup", label: "Бекъп", icon: DatabaseBackup },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-14 px-4 flex items-center gap-2 border-b">
          <div className="h-7 w-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-sm">
            {(settings?.logo_text || settings?.site_name || "E").slice(0, 1).toUpperCase()}
          </div>
          <span className="font-semibold tracking-tight text-sm">
            {settings?.site_name || "EduHub"}
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t space-y-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link to="/"><ExternalLink className="h-4 w-4" /> Към сайта</Link>
          </Button>
          <Button onClick={onLogout} variant="ghost" size="sm" className="w-full justify-start">
            <LogOut className="h-4 w-4" /> Изход
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
