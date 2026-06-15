import { afterEach, describe, expect, it, vi } from "vitest";
import { addRecent, MAX_RECENTS, readRecents, RECENTS_KEY, writeRecents } from "./emoji-recents";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("addRecent", () => {
  it("prepends a new emoji", () => {
    expect(addRecent(["👀"], "👍")).toEqual(["👍", "👀"]);
  });

  it("moves an existing emoji to the front without duplicating", () => {
    expect(addRecent(["👀", "👍", "🎉"], "👍")).toEqual(["👍", "👀", "🎉"]);
  });

  it("caps the list at the max length", () => {
    const many = Array.from({ length: MAX_RECENTS }, (_, index) => `e${index}`);
    const result = addRecent(many, "new");
    expect(result).toHaveLength(MAX_RECENTS);
    expect(result[0]).toBe("new");
  });

  it("respects a custom max", () => {
    expect(addRecent(["a", "b", "c"], "d", 2)).toEqual(["d", "a"]);
  });
});

describe("readRecents", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(readRecents()).toEqual([]);
  });

  it("returns stored string entries only", () => {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(["👍", 5, "👀"]));
    expect(readRecents()).toEqual(["👍", "👀"]);
  });

  it("returns an empty array for non-array JSON", () => {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify({ not: "array" }));
    expect(readRecents()).toEqual([]);
  });

  it("returns an empty array on invalid JSON", () => {
    window.localStorage.setItem(RECENTS_KEY, "{not json");
    expect(readRecents()).toEqual([]);
  });
});

describe("writeRecents", () => {
  it("persists the list", () => {
    writeRecents(["👍", "👀"]);
    expect(JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]")).toEqual(["👍", "👀"]);
  });

  it("swallows storage errors", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeRecents(["👍"])).not.toThrow();
  });
});
