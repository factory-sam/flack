export const RECENTS_KEY = "flack:emoji-recents";
export const MAX_RECENTS = 8;
export const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

export function addRecent(recents: string[], emoji: string, max = MAX_RECENTS): string[] {
  return [emoji, ...recents.filter((item) => item !== emoji)].slice(0, max);
}

export function readRecents(): string[] {
  /* v8 ignore next */
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeRecents(recents: string[]) {
  /* v8 ignore next */
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // localStorage may be unavailable; recents are non-critical.
  }
}
