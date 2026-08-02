// Favorite (pinned) themes — stored per device in localStorage.

export type FavTheme = {
  themeId: string;
  themeName: string;
  classId?: string | null;
  subjectId?: string | null;
  at: number;
};

const KEY = "lexiclass:favorites";

export function getFavorites(): FavTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as FavTheme[]) : [];
    return Array.isArray(arr) ? arr.filter((f) => f && f.themeId) : [];
  } catch {
    return [];
  }
}

export function isFavorite(themeId: string): boolean {
  return getFavorites().some((f) => f.themeId === themeId);
}

export function toggleFavorite(fav: Omit<FavTheme, "at">): boolean {
  const list = getFavorites();
  const exists = list.some((f) => f.themeId === fav.themeId);
  const next = exists
    ? list.filter((f) => f.themeId !== fav.themeId)
    : [{ ...fav, at: Date.now() }, ...list].slice(0, 24);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lexiclass:favorites-changed"));
  return !exists;
}

export function removeFavorite(themeId: string) {
  const next = getFavorites().filter((f) => f.themeId !== themeId);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lexiclass:favorites-changed"));
}
