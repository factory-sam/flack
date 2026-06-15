"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppNotification } from "@/types/chat";
import { markAllNotificationsRead } from "@/features/chat/notifications";

const NOTIFICATION_COLUMNS = "id,user_id,type,message_id,read_at,created_at,messages(body,channel_id)";

export function useNotifications(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
  onNotification?: () => void
) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as unknown as AppNotification[]);
  }, [supabase, userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setNotifications((list) => markAllNotificationsRead(list, now));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }, [supabase, userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`user:${userId}`, { config: { private: true } });
    channel
      .on("broadcast", { event: "INSERT" }, () => {
        void load();
        onNotification?.();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load, onNotification]);

  return { notifications, markAllRead };
}
