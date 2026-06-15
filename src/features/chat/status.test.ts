import { describe, expect, it } from "vitest";
import { expiryFromMinutes, presenceDotClass, presenceLabel, statusActive } from "./status";

describe("expiryFromMinutes", () => {
  it("returns null for non-positive durations", () => {
    expect(expiryFromMinutes(0, 1_000)).toBeNull();
    expect(expiryFromMinutes(-5, 1_000)).toBeNull();
  });

  it("returns an ISO timestamp in the future", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(expiryFromMinutes(30, now)).toBe(new Date(now + 30 * 60_000).toISOString());
  });
});

describe("statusActive", () => {
  const base = { status_text: "Lunch", status_emoji: "🍔", status_expires_at: null };

  it("is false without a profile", () => {
    expect(statusActive(null, 0)).toBe(false);
  });

  it("is false without emoji or text", () => {
    expect(statusActive({ status_text: null, status_emoji: null, status_expires_at: null }, 0)).toBe(false);
  });

  it("is true when there is no expiry", () => {
    expect(statusActive(base, Date.now())).toBe(true);
  });

  it("respects expiry", () => {
    const now = 10_000;
    expect(statusActive({ ...base, status_expires_at: new Date(now + 1000).toISOString() }, now)).toBe(true);
    expect(statusActive({ ...base, status_expires_at: new Date(now - 1000).toISOString() }, now)).toBe(false);
  });
});

describe("presenceLabel", () => {
  it("maps each presence", () => {
    expect(presenceLabel("active")).toBe("Active");
    expect(presenceLabel("away")).toBe("Away");
    expect(presenceLabel("dnd")).toBe("Do not disturb");
  });
});

describe("presenceDotClass", () => {
  it("returns a distinct class per presence", () => {
    expect(presenceDotClass("active")).toContain("accent");
    expect(presenceDotClass("away")).toContain("warn");
    expect(presenceDotClass("dnd")).toContain("danger");
  });
});
