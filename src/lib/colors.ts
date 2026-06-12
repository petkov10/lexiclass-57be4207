import type { CSSProperties } from "react";

// Deterministic hue (0-360) from any string id/name — used for colorful class/subject cards.
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function tintStyle(seed: string): CSSProperties {
  return { ["--hue" as any]: String(hueFromString(seed)) };
}
