import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth, useRole } from "@/hooks/useAuth";
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
  Users,
  CalendarDays,
  FolderUp,
  Menu,
  X,
  Activity,
  FileSignature,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { A11yToolbar } from "@/components/A11yToolbar";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
  tab?: string;
};
const nav: NavItem[] = [
  { to: "/admin", label: "Табло", icon: LayoutDashboard, exact: true },
  { to: "/admin/classes", label: "Класове", icon: GraduationCap },
  { to: "/admin/subjects", label: "Предмети", icon: BookOpen },
  { to: "/admin/themes", label: "Теми", icon: ListTree },
  { to: "/admin/resources", label: "Ресурси", icon: FileStack },
  { to: "/admin/import", label: "Импорт от папка", icon: FolderUp },
  { to: "/admin/schedule", label: "Разписание", icon: CalendarDays },
  { to: "/admin/ai", label: "AI Асистент", icon: Sparkles, tab: "chat" },
  { to: "/admin/ai", label: "Разработка на урок", icon: BookOpen, tab: "plan" },
  { to: "/admin/ai", label: "Училищни документи", icon: FileSignature, tab: "docs" },
  { to: "/admin/ai", label: "AI тестове", icon: ClipboardList, tab: "test" },
  { to: "/admin/users", label: "Потребители", icon: Users, adminOnly: true },
  { to: "/admin/settings", label: "Настройки", icon: SettingsIcon, adminOnly: true },
  { to: "/admin/activity", label: "Дневник", icon: Activity, adminOnly: true },
  { to: "/admin/backup", label: "Миграция и архив", icon: DatabaseBackup, adminOnly: true },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentTab = useRouterState({
    select: (s) => (s.location.search as { tab?: string })?.tab,
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, role } = useRole(user?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const visible = nav.filter((n) => !n.adminOnly || isAdmin);

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const SidebarInner = (
    <>
      <div className="h-14 px-4 flex items-center gap-2 border-b">
        <div className="h-7 w-7 rounded-md gradient-bg text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
          {(settings?.logo_text || settings?.site_name || "L").slice(0, 1).toUpperCase()}
        </div>
        <span className="font-semibold tracking-tight text-sm gradient-text">{settings?.site_name || "LexiClass"}</span>
        {role && role !== "user" && (
          <span className="ml-auto text-[10px] uppercase tracking-wider rounded bg-sidebar-accent px-1.5 py-0.5">{role}</span>
        )}
        <button
          type="button"
          className="md:hidden ml-1 rounded-md p-1 hover:bg-sidebar-accent"
          onClick={() => setOpen(false)}
          aria-label="Затвори меню"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = item.tab
            ? pathname === "/admin/ai" && (currentTab || "chat") === item.tab
            : item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to) && pathname !== "/admin/ai";
          return (
            <Link
              key={item.to + (item.tab ?? "")}
              to={item.to}
              search={item.tab ? ({ tab: item.tab } as never) : undefined}
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
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r bg-sidebar text-sidebar-foreground flex-col">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground flex flex-col shadow-xl">
            {SidebarInner}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 px-4 md:px-6 pt-3 md:pt-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="md:hidden rounded-md border p-2 hover:bg-accent"
            aria-label="Отвори меню"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="md:hidden text-sm font-medium truncate">
            {visible.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "Админ"}
          </div>
          <div className="ml-auto">
            <ThemeModeToggle />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-8 pt-2">{children}</div>
      </main>
      <A11yToolbar />
    </div>
  );
}
