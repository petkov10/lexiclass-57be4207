import { Link, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogIn, Settings as SettingsIcon, Home } from "lucide-react";

export function PublicShell({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQuery);
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-7 w-7 rounded" />
            ) : (
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">
                {(settings?.logo_text || settings?.site_name || "E").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span>{settings?.logo_text || settings?.site_name || "Izvor"}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {pathname !== "/" && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/"><Home /> Начало</Link>
              </Button>
            )}
            {isAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin"><SettingsIcon /> Админ</Link>
              </Button>
            ) : !user ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth"><LogIn /> Вход</Link>
              </Button>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
