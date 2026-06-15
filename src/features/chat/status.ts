import type { PresenceState, Profile } from "@/types/chat";

export const STATUS_DURATIONS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "Today", minutes: 480 },
  { label: "Don't clear", minutes: 0 }
];

export function expiryFromMinutes(minutes: number, nowMs: number): string | null {
  if (minutes <= 0) return null;
  return new Date(nowMs + minutes * 60_000).toISOString();
}

export function statusActive(
  profile: Pick<Profile, "status_text" | "status_emoji" | "status_expires_at"> | null,
  nowMs: number
): boolean {
  if (!profile) return false;
  if (!profile.status_text && !profile.status_emoji) return false;
  if (!profile.status_expires_at) return true;
  return new Date(profile.status_expires_at).getTime() > nowMs;
}

export function presenceLabel(presence: PresenceState): string {
  switch (presence) {
    case "active":
      return "Active";
    case "away":
      return "Away";
    case "dnd":
      return "Do not disturb";
  }
}

export function presenceDotClass(presence: PresenceState): string {
  switch (presence) {
    case "active":
      return "bg-[var(--accent)]";
    case "away":
      return "bg-[var(--warn)]";
    case "dnd":
      return "bg-[var(--danger)]";
  }
}
