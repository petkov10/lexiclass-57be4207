import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";
import { GraduationCap, BookOpen, ListTree, Home, Sparkles, Settings } from "lucide-react";
import { useAuth, useRole } from "@/hooks/useAuth";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit } = useRole(user?.id);

  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes } = useQuery(allThemesQuery);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Търси клас, предмет, тема… (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Няма съвпадения.</CommandEmpty>
        <CommandGroup heading="Навигация">
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}>
            <Home className="mr-2 h-4 w-4" /> Начало
          </CommandItem>
          {canEdit && (
            <>
              <CommandItem onSelect={() => go(() => navigate({ to: "/admin" }))}>
                <Settings className="mr-2 h-4 w-4" /> Админ табло
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/admin/ai" }))}>
                <Sparkles className="mr-2 h-4 w-4" /> AI Асистент
              </CommandItem>
            </>
          )}
        </CommandGroup>
        {classes && classes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Класове">
              {classes.map((c) => (
                <CommandItem key={c.id} value={`клас ${c.name}`}
                  onSelect={() => go(() => navigate({ to: "/class/$classId", params: { classId: c.id } }))}>
                  <GraduationCap className="mr-2 h-4 w-4" /> {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {subjects && subjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Предмети">
              {subjects.map((s) => (
                <CommandItem key={s.id} value={`предмет ${s.name}`} onSelect={() => setOpen(false)}>
                  <BookOpen className="mr-2 h-4 w-4" /> {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {themes && themes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Теми">
              {themes.slice(0, 50).map((t) => (
                <CommandItem key={t.id} value={`тема ${t.name}`}
                  onSelect={() => go(() => navigate({ to: "/theme/$themeId", params: { themeId: t.id } }))}>
                  <ListTree className="mr-2 h-4 w-4" /> {t.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
