import { useEffect, useState } from "react";
import { Accessibility, Contrast, Type, MonitorPlay, Sun, Moon, Laptop, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  applyA11y,
  applyTheme,
  getFontScale,
  getHighContrast,
  getProjector,
  getStoredTheme,
  setFontScale,
  setHighContrast,
  setProjector,
  setStoredTheme,
  startThemeScheduler,
  type FontScale,
  type ThemeChoice,
} from "@/lib/a11y";

const SCALES: { v: FontScale; label: string }[] = [
  { v: "sm", label: "А" },
  { v: "md", label: "А" },
  { v: "lg", label: "А" },
  { v: "xl", label: "А" },
];

const THEMES: { v: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { v: "light", label: "Светла", Icon: Sun },
  { v: "dark", label: "Тъмна", Icon: Moon },
  { v: "auto", label: "Системна", Icon: Laptop },
  { v: "schedule", label: "Вечер", Icon: Clock },
];

export function A11yToolbar() {
  const [scale, setScale] = useState<FontScale>("md");
  const [contrast, setContrast] = useState(false);
  const [projector, setProj] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    applyA11y();
    applyTheme();
    setScale(getFontScale());
    setContrast(getHighContrast());
    setProj(getProjector());
    setTheme(getStoredTheme());
    return startThemeScheduler();
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg h-11 w-11"
            aria-label="Достъпност"
            title="Достъпност"
          >
            <Accessibility className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-72 space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
              <Type className="h-3.5 w-3.5" /> Размер на текста
            </div>
            <div className="grid grid-cols-4 gap-1">
              {SCALES.map((s, i) => (
                <button
                  key={s.v}
                  onClick={() => { setFontScale(s.v); setScale(s.v); }}
                  className={`rounded-md border py-2 hover:bg-accent transition ${scale === s.v ? "border-primary bg-primary/10" : ""}`}
                  aria-label={`Размер ${s.v}`}
                  aria-pressed={scale === s.v}
                >
                  <span style={{ fontSize: `${0.8 + i * 0.2}rem` }} className="font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
              <Moon className="h-3.5 w-3.5" /> Тема
            </div>
            <div className="grid grid-cols-4 gap-1">
              {THEMES.map(({ v, label, Icon }) => (
                <button
                  key={v}
                  onClick={() => { setStoredTheme(v); setTheme(v); }}
                  title={v === "schedule" ? "Тъмна вечер (19:00–07:00)" : label}
                  aria-pressed={theme === v}
                  className={`rounded-md border py-2 flex flex-col items-center gap-1 text-[10px] hover:bg-accent transition ${theme === v ? "border-primary bg-primary/10" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
              <Contrast className="h-3.5 w-3.5" /> Висок контраст
            </div>
            <Button
              variant={contrast ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => { const n = !contrast; setHighContrast(n); setContrast(n); }}
              aria-pressed={contrast}
            >
              {contrast ? "Включен" : "Изключен"}
            </Button>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
              <MonitorPlay className="h-3.5 w-3.5" /> Режим „Проектор“
            </div>
            <Button
              variant={projector ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => { const n = !projector; setProjector(n); setProj(n); }}
              aria-pressed={projector}
            >
              {projector ? "Включен — едър шрифт" : "Изключен"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
