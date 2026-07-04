// Client-side accessibility & theme preferences
// Stored in localStorage so they persist across sessions per device.

export const THEME_KEY = "lexiclass:theme-mode"; // "light" | "dark" | "auto"
export const SCALE_KEY = "lexiclass:font-scale"; // "sm" | "md" | "lg" | "xl"
export const CONTRAST_KEY = "lexiclass:high-contrast"; // "1" | ""

export type ThemeChoice = "light" | "dark" | "auto";
export type FontScale = "sm" | "md" | "lg" | "xl";

export function getStoredTheme(): ThemeChoice | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "auto" ? v : null;
}
export function setStoredTheme(v: ThemeChoice | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(THEME_KEY, v);
  else localStorage.removeItem(THEME_KEY);
  applyTheme();
}

export function applyTheme() {
  if (typeof document === "undefined") return;
  const stored = getStoredTheme();
  const root = document.documentElement;
  let mode: "light" | "dark" = "light";
  if (stored === "dark") mode = "dark";
  else if (stored === "light") mode = "light";
  else if (stored === "auto") mode = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  else {
    // Fall back to whatever was already set by settings hook
    return;
  }
  root.classList.toggle("dark", mode === "dark");
}

export function getFontScale(): FontScale {
  if (typeof window === "undefined") return "md";
  const v = localStorage.getItem(SCALE_KEY);
  return v === "sm" || v === "md" || v === "lg" || v === "xl" ? v : "md";
}
export function setFontScale(v: FontScale) {
  localStorage.setItem(SCALE_KEY, v);
  applyA11y();
}
export function getHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONTRAST_KEY) === "1";
}
export function setHighContrast(v: boolean) {
  localStorage.setItem(CONTRAST_KEY, v ? "1" : "");
  applyA11y();
}

export function applyA11y() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-font-scale", getFontScale());
  root.classList.toggle("high-contrast", getHighContrast());
}
