"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { AppNotification } from "@/types/chat";
import { notificationLabel, unreadNotificationCount } from "@/features/chat/notifications";

export function NotificationBell({
  notifications,
  onMarkAllRead,
  onSelect
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onSelect: (channelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = unreadNotificationCount(notifications);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative grid h-7 w-7 place-items-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      >
        <Bell size={14} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--accent)] px-0.5 text-[9px] font-medium text-[var(--bg)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[320px] rounded-[6px] border border-[var(--line-strong)] bg-[var(--surface)] shadow-xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <span className="text-xs font-medium">Notifications</span>
            {unread > 0 ? (
              <button onClick={onMarkAllRead} className="text-[10px] uppercase tracking-wide text-[var(--accent)]">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="thin-scrollbar max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-[var(--faint)]">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (notification.messages?.channel_id) onSelect(notification.messages.channel_id);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col gap-0.5 border-b border-[var(--line)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text)]">
                      {notificationLabel(notification.type)}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--faint)]">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  {notification.messages?.body ? (
                    <span className="truncate text-[11px] text-[var(--muted)]">{notification.messages.body}</span>
                  ) : null}
                  {!notification.read_at ? <span className="h-1 w-1 rounded-full bg-[var(--accent)]" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
