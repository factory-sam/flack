import { describe, expect, it } from "vitest";
import { channelLastRead, firstUnreadId, unreadTotal } from "./unread";
import type { Channel, ChatMessage } from "@/types/chat";

function channel(members: Channel["channel_members"]): Channel {
  return {
    id: "c1",
    org_id: "o1",
    type: "public",
    name: "general",
    topic: null,
    created_at: "t",
    channel_members: members
  };
}

function message(id: string, createdAt: string, authorId: string): ChatMessage {
  return {
    id,
    channel_id: "c1",
    author_id: authorId,
    body: "hi",
    parent_id: null,
    edited_at: null,
    deleted_at: null,
    created_at: createdAt
  };
}

describe("channelLastRead", () => {
  it("returns null without a channel or user", () => {
    expect(channelLastRead(undefined, "u1")).toBeNull();
    expect(channelLastRead(channel([]), undefined)).toBeNull();
  });

  it("returns the member's last_read_at", () => {
    const result = channelLastRead(channel([{ user_id: "u1", role: "member", last_read_at: "2026-01-01" }]), "u1");
    expect(result).toBe("2026-01-01");
  });

  it("returns null when the member is absent", () => {
    expect(channelLastRead(channel([{ user_id: "other", role: "member", last_read_at: "x" }]), "u1")).toBeNull();
  });
});

describe("firstUnreadId", () => {
  const messages = [
    message("a", "2026-01-01", "u2"),
    message("b", "2026-01-02", "u2"),
    message("c", "2026-01-03", "u1")
  ];

  it("returns null when nothing is read yet", () => {
    expect(firstUnreadId(messages, null, "u1")).toBeNull();
  });

  it("returns the first message after last read from another author", () => {
    expect(firstUnreadId(messages, "2026-01-01", "u1")).toBe("b");
  });

  it("skips the current user's own messages", () => {
    expect(firstUnreadId(messages, "2026-01-02", "u1")).toBeNull();
  });
});

describe("unreadTotal", () => {
  it("sums all channel counts", () => {
    expect(unreadTotal({ a: 2, b: 0, c: 5 })).toBe(7);
  });

  it("returns 0 for an empty map", () => {
    expect(unreadTotal({})).toBe(0);
  });
});
