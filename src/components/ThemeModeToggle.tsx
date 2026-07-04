import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, setStoredTheme } from "@/lib/a11y";

export function ThemeModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    applyTheme();
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setStoredTheme(next);
    setDark(next === "dark");
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Светъл режим" : "Тъмен режим"}
      title={dark ? "Светъл режим" : "Тъмен режим"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
