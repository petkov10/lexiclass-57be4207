// Supabase Storage object keys allow only a limited ASCII set.
// Cyrillic, spaces and many symbols cause "Invalid key" errors on upload.
// This helper transliterates Cyrillic → Latin and strips unsafe characters
// while preserving the file extension.

const CYR_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "Zh", З: "Z",
  И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P",
  Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "H", Ц: "Ts", Ч: "Ch",
  Ш: "Sh", Щ: "Sht", Ъ: "A", Ь: "Y", Ю: "Yu", Я: "Ya",
};

export function transliterate(input: string): string {
  let out = "";
  for (const ch of input) out += CYR_MAP[ch] ?? ch;
  return out;
}

export function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const safeBase =
    transliterate(base)
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "file";
  const safeExt = transliterate(ext).replace(/[^a-zA-Z0-9.]+/g, "");
  return safeBase + safeExt;
}
