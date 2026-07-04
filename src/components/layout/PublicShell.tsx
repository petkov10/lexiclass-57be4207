import { Link, useRouterState } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { useAuth, useRole } from "@/hooks/useAuth";
import { useLogoUrl } from "@/hooks/useLogoUrl";
import { Button } from "@/components/ui/button";
import { LogIn, Settings as SettingsIcon, Home } from "lucide-react";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { A11yToolbar } from "@/components/A11yToolbar";

export function PublicShell({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQuery);
  const { user } = useAuth();
  const { canEdit } = useRole(user?.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logoSrc = useLogoUrl(settings?.logo_url);
  const [logoBroken, setLogoBroken] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            {logoSrc && !logoBroken ? (
              <img src={logoSrc} alt="" className="h-7 w-7 rounded object-contain" onError={() => setLogoBroken(true)} />
            ) : (
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm">
                {(settings?.logo_text || settings?.site_name || "E").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="gradient-text">{settings?.logo_text || settings?.site_name || "LexiClass"}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {pathname !== "/" && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/"><Home /> Начало</Link>
              </Button>
            )}
            <ThemeModeToggle />
            {canEdit ? (
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
      <A11yToolbar />
    </div>
  );
}
