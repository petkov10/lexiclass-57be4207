import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";
import { Search, GraduationCap, BookOpen, ListTree, X } from "lucide-react";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

type Hit =
  | { kind: "class"; id: string; name: string; sub?: string }
  | { kind: "subject"; id: string; name: string; sub?: string }
  | { kind: "theme"; id: string; name: string; sub?: string };

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes } = useQuery(allThemesQuery);

  // Ctrl/Cmd + K opens & focuses
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        (document.getElementById("global-search") as HTMLInputElement | null)?.focus();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const n = normalize(q);
    if (!n) return [];
    const classById = new Map((classes ?? []).map((c) => [c.id, c.name]));
    const subjectById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
    const out: Hit[] = [];
    (classes ?? []).forEach((c) => normalize(c.name).includes(n) && out.push({ kind: "class", id: c.id, name: c.name }));
    (subjects ?? []).forEach((s) => normalize(s.name).includes(n) && out.push({ kind: "subject", id: s.id, name: s.name }));
    (themes ?? []).forEach((t) => {
      if (!normalize(t.name).includes(n)) return;
      const parts = [classById.get(t.class_id), subjectById.get(t.subject_id)].filter(Boolean) as string[];
      out.push({ kind: "theme", id: t.id, name: t.name, sub: parts.join(" · ") });
    });
    return out.slice(0, 30);
  }, [q, classes, subjects, themes]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  const goto = (h: Hit) => {
    setOpen(false);
    setQ("");
    if (h.kind === "class") navigate({ to: "/class/$classId", params: { classId: h.id } });
    else if (h.kind === "theme") navigate({ to: "/theme/$themeId", params: { themeId: h.id } });
    else {
      // subject — go to a class that has it; fallback: first class
      const first = classes?.[0];
      if (first) navigate({ to: "/class/$classId/subject/$subjectId", params: { classId: first.id, subjectId: h.id } });
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          id="global-search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter" && hits[activeIdx]) { e.preventDefault(); goto(hits[activeIdx]); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
          placeholder="Търси клас, предмет или тема…"
          className="w-full h-12 pl-10 pr-10 rounded-2xl border-2 border-border bg-card/80 backdrop-blur shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && q && (
        <div className="absolute z-40 left-0 right-0 mt-2 rounded-xl border bg-popover shadow-xl max-h-[60vh] overflow-auto animate-pop">
          {hits.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Няма съвпадения за „{q}"</div>
          ) : (
            <ul className="py-1">
              {hits.map((h, i) => {
                const Icon = h.kind === "class" ? GraduationCap : h.kind === "subject" ? BookOpen : ListTree;
                const label = h.kind === "class" ? "Клас" : h.kind === "subject" ? "Предмет" : "Тема";
                const active = i === activeIdx;
                return (
                  <li key={`${h.kind}-${h.id}`}>
                    <button
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => goto(h)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 ${active ? "bg-accent" : ""}`}
                    >
                      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug break-words">{h.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                          {label}{h.sub ? <span className="normal-case tracking-normal text-muted-foreground/80"> · {h.sub}</span> : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
