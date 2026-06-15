import type { AppNotification, NotificationType } from "@/types/chat";

export function notificationLabel(type: NotificationType): string {
  switch (type) {
    case "mention":
      return "Mentioned you";
    case "thread":
      return "Replied to your thread";
    case "dm":
      return "Sent you a direct message";
    case "reaction":
      return "Reacted to your message";
  }
}

export function unreadNotificationCount(list: AppNotification[]): number {
  return list.filter((notification) => !notification.read_at).length;
}

export function markAllNotificationsRead(list: AppNotification[], readAt: string): AppNotification[] {
  return list.map((notification) => (notification.read_at ? notification : { ...notification, read_at: readAt }));
}

export function mergeNotification(list: AppNotification[], incoming: AppNotification, max = 20): AppNotification[] {
  const without = list.filter((notification) => notification.id !== incoming.id);
  return [incoming, ...without].slice(0, max);
}
