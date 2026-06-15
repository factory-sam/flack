"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ChatMessage } from "@/types/chat";
import { mergeIncomingMessage, removeMessage } from "@/features/messages/optimistic";

export type TypingState = Record<string, { name: string; at: number }>;

type DbMessagePayload = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

function payloadRecord(payload: { record?: DbMessagePayload; new?: DbMessagePayload; new_record?: DbMessagePayload }) {
  return payload.record ?? payload.new ?? payload.new_record;
}

function payloadOldRecord(payload: { old_record?: DbMessagePayload; old?: DbMessagePayload }) {
  return payload.old_record ?? payload.old;
}

type ChannelRealtimeArgs = {
  supabase: SupabaseClient<Database>;
  activeChannelId: string | null;
  user: User | null;
  displayName: string | null | undefined;
  fetchMessages: (channelId: string, parentId?: string | null) => Promise<ChatMessage[]>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setTyping: Dispatch<SetStateAction<TypingState>>;
  setOnlineCount: Dispatch<SetStateAction<number>>;
  channelRef: MutableRefObject<RealtimeChannel | null>;
};

export function useChannelRealtime({
  supabase,
  activeChannelId,
  user,
  displayName,
  fetchMessages,
  setMessages,
  setTyping,
  setOnlineCount,
  channelRef
}: ChannelRealtimeArgs) {
  useEffect(() => {
    if (!activeChannelId || !user) return;

    const channel: RealtimeChannel = supabase.channel(`channel:${activeChannelId}`, {
      config: {
        private: true,
        broadcast: { self: true },
        presence: { key: user.id }
      }
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "INSERT" }, ({ payload }) => {
        if (payload.table === "reactions") {
          fetchMessages(activeChannelId).then(setMessages);
          return;
        }
        const record = payloadRecord(payload);
        if (!record || record.channel_id !== activeChannelId || record.parent_id) return;
        setMessages((current) => mergeIncomingMessage(current, record));
      })
      .on("broadcast", { event: "UPDATE" }, ({ payload }) => {
        if (payload.table === "reactions") {
          fetchMessages(activeChannelId).then(setMessages);
          return;
        }
        const record = payloadRecord(payload);
        if (!record || record.channel_id !== activeChannelId || record.parent_id) return;
        if (record.deleted_at) {
          setMessages((current) => removeMessage(current, record.id));
          return;
        }
        setMessages((current) => mergeIncomingMessage(current, record));
      })
      .on("broadcast", { event: "DELETE" }, ({ payload }) => {
        if (payload.table === "reactions") {
          fetchMessages(activeChannelId).then(setMessages);
          return;
        }
        const oldRecord = payloadOldRecord(payload);
        if (!oldRecord || oldRecord.channel_id !== activeChannelId) return;
        setMessages((current) => removeMessage(current, oldRecord.id));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.user_id === user.id) return;
        setTyping((current) => ({
          ...current,
          [payload.user_id]: { name: payload.name ?? "Someone", at: Date.now() }
        }));
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: displayName ?? user.email,
            online_at: new Date().toISOString()
          });
        }
      });

    const cleanupTyping = window.setInterval(() => {
      const now = Date.now();
      setTyping((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => now - value.at < 3500)));
    }, 1500);

    return () => {
      window.clearInterval(cleanupTyping);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, fetchMessages, displayName, supabase, user, setMessages, setTyping, setOnlineCount, channelRef]);
}
