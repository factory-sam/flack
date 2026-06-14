import { describe, expect, it } from "vitest";
import { markMessageFailed, mergeIncomingMessage, removeMessage } from "./optimistic";
import type { ChatMessage } from "@/types/chat";

const base: ChatMessage = {
  id: "m1",
  channel_id: "c1",
  author_id: "u1",
  body: "hello",
  parent_id: null,
  edited_at: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  pending: true
};

describe("optimistic message helpers", () => {
  it("dedupes the broadcast echo by client generated id", () => {
    const merged = mergeIncomingMessage([base], { ...base, body: "hello", pending: false });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.pending).toBe(false);
  });

  it("keeps messages sorted after an incoming broadcast", () => {
    const later = { ...base, id: "m2", created_at: "2026-01-01T00:01:00.000Z" };
    const merged = mergeIncomingMessage([later], base);
    expect(merged.map((message) => message.id)).toEqual(["m1", "m2"]);
  });

  it("updates an existing message in place and preserves ordering", () => {
    const later = { ...base, id: "m2", created_at: "2026-01-01T00:02:00.000Z" };
    const merged = mergeIncomingMessage([base, later], { ...base, body: "edited", pending: false });
    expect(merged).toHaveLength(2);
    expect(merged.find((message) => message.id === "m1")?.body).toBe("edited");
    expect(merged.map((message) => message.id)).toEqual(["m1", "m2"]);
  });

  it("marks failed inserts without removing local context", () => {
    const [failed] = markMessageFailed([base], "m1");
    expect(failed?.failed).toBe(true);
    expect(failed?.pending).toBe(false);
  });

  it("only marks the matching message and leaves others untouched", () => {
    const other = { ...base, id: "m2" };
    const result = markMessageFailed([base, other], "m2");
    expect(result.find((message) => message.id === "m1")).toEqual(base);
    expect(result.find((message) => message.id === "m2")?.failed).toBe(true);
  });

  it("removes a message by id on a delete broadcast", () => {
    const other = { ...base, id: "m2" };
    const remaining = removeMessage([base, other], "m1");
    expect(remaining.map((message) => message.id)).toEqual(["m2"]);
  });
});
