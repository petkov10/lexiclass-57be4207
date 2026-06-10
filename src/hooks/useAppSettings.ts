import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { useEffect } from "react";

export function useApplySettings() {
  const { data } = useQuery(settingsQuery);
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    root.setAttribute("data-color-scheme", data.color_scheme || "blue");
    if (data.theme_mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [data]);
  return data;
}
