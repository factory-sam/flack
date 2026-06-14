import { describe, expect, it } from "vitest";
import { channelLabel, cn, formatTime, initials } from "./utils";

describe("cn", () => {
  it("merges class names and dedupes conflicting tailwind utilities", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsey values and keeps conditional classes", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatTime", () => {
  it("formats an ISO timestamp as hour and minute", () => {
    const formatted = formatTime("2026-01-01T13:05:00.000Z");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("initials", () => {
  it("returns the first letters of the first two words, uppercased", () => {
    expect(initials("ada lovelace")).toBe("AL");
  });

  it("uses a single initial for a one-word name", () => {
    expect(initials("Grace")).toBe("G");
  });

  it("falls back to ? for empty or nullish names", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
    expect(initials(undefined)).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("channelLabel", () => {
  it("prefixes public/private channel names with #", () => {
    expect(channelLabel("general", "public")).toBe("#general");
    expect(channelLabel("secret", "private")).toBe("#secret");
  });

  it("uses the raw name for direct messages", () => {
    expect(channelLabel("alice:bob", "dm")).toBe("alice:bob");
  });

  it("provides fallbacks when the name is null", () => {
    expect(channelLabel(null, "dm")).toBe("Direct message");
    expect(channelLabel(null, "public")).toBe("#untitled");
  });
});
