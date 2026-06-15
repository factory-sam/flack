import { describe, expect, it } from "vitest";
import {
  markAllNotificationsRead,
  mergeNotification,
  notificationLabel,
  unreadNotificationCount
} from "./notifications";
import type { AppNotification } from "@/types/chat";

function notification(id: string, readAt: string | null = null): AppNotification {
  return { id, user_id: "u1", type: "mention", message_id: "m1", read_at: readAt, created_at: "2026-01-01" };
}

describe("notificationLabel", () => {
  it("maps every notification type", () => {
    expect(notificationLabel("mention")).toBe("Mentioned you");
    expect(notificationLabel("thread")).toBe("Replied to your thread");
    expect(notificationLabel("dm")).toBe("Sent you a direct message");
    expect(notificationLabel("reaction")).toBe("Reacted to your message");
  });
});

describe("unreadNotificationCount", () => {
  it("counts only unread notifications", () => {
    expect(unreadNotificationCount([notification("a"), notification("b", "2026-01-02"), notification("c")])).toBe(2);
  });
});

describe("markAllNotificationsRead", () => {
  it("sets read_at on unread notifications only", () => {
    const result = markAllNotificationsRead([notification("a"), notification("b", "earlier")], "2026-06-01");
    expect(result[0].read_at).toBe("2026-06-01");
    expect(result[1].read_at).toBe("earlier");
  });
});

describe("mergeNotification", () => {
  it("prepends a new notification", () => {
    expect(mergeNotification([notification("a")], notification("b")).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("deduplicates by id", () => {
    expect(mergeNotification([notification("a")], notification("a")).map((item) => item.id)).toEqual(["a"]);
  });

  it("caps to the max length", () => {
    const list = Array.from({ length: 20 }, (_, index) => notification(`n${index}`));
    expect(mergeNotification(list, notification("new"))).toHaveLength(20);
  });
});
