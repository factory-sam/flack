import type { ChatMessage } from "@/types/chat";

export function mergeIncomingMessage(messages: ChatMessage[], incoming: ChatMessage) {
  const index = messages.findIndex((message) => message.id === incoming.id);

  if (index === -1) {
    return [...messages, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const next = [...messages];
  next[index] = { ...next[index], ...incoming, pending: false, failed: false };
  return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function markMessageFailed(messages: ChatMessage[], id: string) {
  return messages.map((message) => (message.id === id ? { ...message, pending: false, failed: true } : message));
}

export function removeMessage(messages: ChatMessage[], id: string) {
  return messages.filter((message) => message.id !== id);
}
