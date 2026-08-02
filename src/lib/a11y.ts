// Client-side accessibility & theme preferences
// Stored in localStorage so they persist across sessions per device.

export const THEME_KEY = "lexiclass:theme-mode"; // "light" | "dark" | "auto" | "schedule"
export const SCALE_KEY = "lexiclass:font-scale"; // "sm" | "md" | "lg" | "xl"
export const CONTRAST_KEY = "lexiclass:high-contrast"; // "1" | ""
export const PROJECTOR_KEY = "lexiclass:projector"; // "1" | ""

export type ThemeChoice = "light" | "dark" | "auto" | "schedule";
export type FontScale = "sm" | "md" | "lg" | "xl";

/** Evening window for the "schedule" theme: dark from 19:00 to 07:00. */
export function isEvening(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

export function getStoredTheme(): ThemeChoice | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "auto" || v === "schedule" ? v : null;
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
  else if (stored === "schedule") mode = isEvening() ? "dark" : "light";
  else {
    // Fall back to whatever was already set by settings hook
    return;
  }
  root.classList.toggle("dark", mode === "dark");
}

/** Re-evaluates the scheduled theme every minute (no-op for other modes). */
export function startThemeScheduler(): () => void {
  if (typeof window === "undefined") return () => {};
  const id = window.setInterval(() => {
    if (getStoredTheme() === "schedule") applyTheme();
  }, 60_000);
  return () => window.clearInterval(id);
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

/** Projector mode: very large text + high contrast, for showing in class. */
export function getProjector(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PROJECTOR_KEY) === "1";
}
export function setProjector(v: boolean) {
  localStorage.setItem(PROJECTOR_KEY, v ? "1" : "");
  applyA11y();
}

export function applyA11y() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-font-scale", getFontScale());
  root.classList.toggle("high-contrast", getHighContrast());
  root.classList.toggle("projector", getProjector());
}
