"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function useUnread(supabase: SupabaseClient<Database>, userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("channel_unread_counts");
    if (!data) return;
    setUnreadCounts(Object.fromEntries(data.map((row) => [row.channel_id, Number(row.unread)])));
  }, [supabase, userId]);

  const markChannelRead = useCallback(
    async (channelId: string, readAt: string) => {
      if (!userId) return;
      setUnreadCounts((current) => ({ ...current, [channelId]: 0 }));
      await supabase
        .from("channel_members")
        .update({ last_read_at: readAt })
        .eq("channel_id", channelId)
        .eq("user_id", userId);
    },
    [supabase, userId]
  );

  useEffect(() => {
    function onFocus() {
      void refreshUnread();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  return { unreadCounts, refreshUnread, markChannelRead };
}
