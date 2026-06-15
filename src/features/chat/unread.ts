import type { Channel, ChatMessage } from "@/types/chat";

export function channelLastRead(channel: Channel | undefined, userId: string | undefined): string | null {
  if (!channel || !userId) return null;
  return channel.channel_members?.find((member) => member.user_id === userId)?.last_read_at ?? null;
}

export function firstUnreadId(
  messages: ChatMessage[],
  lastReadAt: string | null,
  currentUserId: string | undefined
): string | null {
  if (!lastReadAt) return null;
  const found = messages.find((message) => message.created_at > lastReadAt && message.author_id !== currentUserId);
  return found ? found.id : null;
}

export function unreadTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}
