export type GradingTier = { min_percent: number; grade: number };
export type GradingScale = GradingTier[];

export const DEFAULT_SCALE: GradingScale = [
  { min_percent: 90, grade: 6.0 },
  { min_percent: 75, grade: 5.0 },
  { min_percent: 60, grade: 4.0 },
  { min_percent: 45, grade: 3.0 },
  { min_percent: 0, grade: 2.0 },
];

export function percentToGrade(percent: number, scale: GradingScale = DEFAULT_SCALE): number {
  const sorted = [...scale].sort((a, b) => b.min_percent - a.min_percent);
  for (const t of sorted) if (percent >= t.min_percent) return t.grade;
  return 2.0;
}

export function gradeLabel(grade: number): string {
  if (grade >= 5.5) return "Отличен";
  if (grade >= 4.5) return "Много добър";
  if (grade >= 3.5) return "Добър";
  if (grade >= 2.5) return "Среден";
  return "Слаб";
}

// Deterministic shuffle by seed (simple LCG) so a student sees same order across reload of same attempt
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
