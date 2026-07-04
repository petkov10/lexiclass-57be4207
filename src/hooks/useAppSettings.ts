import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { useEffect } from "react";
import { applyA11y, getStoredTheme } from "@/lib/a11y";

export function useApplySettings() {
  const { data } = useQuery(settingsQuery);
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    root.setAttribute("data-color-scheme", data.color_scheme || "blue");
    // User override wins over admin setting
    const override = getStoredTheme();
    let dark = data.theme_mode === "dark";
    if (override === "dark") dark = true;
    else if (override === "light") dark = false;
    else if (override === "auto") dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? dark;
    root.classList.toggle("dark", dark);
    applyA11y();
  }, [data]);
  return data;
}
