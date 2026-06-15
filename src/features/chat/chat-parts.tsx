"use client";

import { useState, type ReactNode } from "react";
import { Hash, Lock, MessageSquare, Paperclip, Pencil, Plus, Search, Send, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { channelLabel, cn, formatTime, initials } from "@/lib/utils";
import type { Channel, ChatMessage, Profile, SearchHit } from "@/types/chat";
import { DEFAULT_EMOJIS } from "@/features/chat/emoji-recents";
import { ReactionPicker } from "@/features/chat/reaction-picker";
import { MessageBody } from "@/features/chat/message-body";

const emojiQuick = DEFAULT_EMOJIS.slice(0, 3);

function displayEmoji(token: string) {
  if (token === "+1") return "👍";
  if (token === "eyes") return "👀";
  if (token === "check") return "✓";
  return token;
}

export function SectionTitle({ icon, label, className }: { icon: ReactNode; label: string; className?: string }) {
  return (
    <p
      className={cn(
        "mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]",
        className
      )}
    >
      {icon}
      {label}
    </p>
  );
}

function ChannelIcon({ channel }: { channel: Channel | null }) {
  if (channel?.type === "private") return <Lock size={14} className="text-[var(--muted)]" />;
  if (channel?.type === "dm") return <MessageSquare size={14} className="text-[var(--muted)]" />;
  return <Hash size={14} className="text-[var(--muted)]" />;
}

export function ChannelButton({
  channel,
  active,
  unread = 0,
  onClick
}: {
  channel: Channel;
  active: boolean;
  unread?: number;
  onClick: () => void;
}) {
  const hasUnread = unread > 0 && !active;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-[5px] px-1.5 text-left text-xs transition-colors",
        active
          ? "bg-[var(--surface-2)] text-[var(--text)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        hasUnread && "font-semibold text-[var(--text)]"
      )}
    >
      <ChannelIcon channel={channel} />
      <span className="truncate">{channelLabel(channel.name, channel.type)}</span>
      {hasUnread ? (
        <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-medium text-[var(--bg)]">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-[4px] border border-[var(--line)] bg-[var(--surface-2)] font-mono font-medium text-[var(--muted)]",
        size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"
      )}
    >
      {initials(name)}
    </div>
  );
}

export function CurrentUserBadge({ profile, user }: { profile: Profile | null; user: User | null }) {
  return (
    <div className="border-t border-[var(--line)] px-2 py-2">
      <div className="flex items-center gap-2 px-1">
        <Avatar name={profile?.display_name ?? user?.email ?? "Me"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{profile?.display_name ?? user?.email}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">{profile?.role ?? "member"}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminSetupPanel({
  visible,
  inviteEmail,
  onInviteEmail,
  onCreateInvite,
  inviteLink,
  inviteMessage
}: {
  visible: boolean;
  inviteEmail: string;
  onInviteEmail: (value: string) => void;
  onCreateInvite: () => void;
  inviteLink: string | null;
  inviteMessage: string | null;
}) {
  if (!visible) return null;
  return (
    <div className="mb-4 border-b border-[var(--line)] pb-3">
      <SectionTitle icon={<Plus size={12} />} label="Setup" />
      <div className="space-y-1.5">
        <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">
          Invite the first teammate. Links expire after 7 days.
        </p>
        <div className="flex gap-1">
          <Input
            density="compact"
            value={inviteEmail}
            onChange={(event) => onInviteEmail(event.target.value)}
            placeholder="person@company.com"
          />
          <Button size="icon" variant="ghost" onClick={onCreateInvite} aria-label="Create invite">
            <Plus size={13} />
          </Button>
        </div>
        {inviteLink ? (
          <p className="break-all rounded-[4px] border border-[var(--line)] p-1.5 text-[10px] leading-4 text-[var(--muted)]">
            Copied: {inviteLink}
          </p>
        ) : null}
        {inviteMessage ? <p className="px-1 text-[10px] leading-4 text-[var(--danger)]">{inviteMessage}</p> : null}
      </div>
    </div>
  );
}

export function ChannelHeader({
  activeChannel,
  onlineCount,
  messageCount
}: {
  activeChannel: Channel | null;
  onlineCount: number;
  messageCount: number;
}) {
  return (
    <header className="flex h-11 items-center justify-between border-b border-[var(--line)] bg-[var(--surface-0)] px-4">
      <div className="flex min-w-0 items-center gap-2">
        <ChannelIcon channel={activeChannel} />
        <h1 className="truncate text-sm font-medium">
          {activeChannel ? channelLabel(activeChannel.name, activeChannel.type) : "No channel"}
        </h1>
        {activeChannel?.topic ? (
          <span className="hidden truncate border-l border-[var(--line)] pl-2 text-xs text-[var(--muted)] md:block">
            {activeChannel.topic}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
        <span>{onlineCount} online</span>
        <span>{messageCount} messages</span>
      </div>
    </header>
  );
}

function ChannelEmptyState({
  activeChannel,
  isAdmin,
  onDraft,
  onPrepareChannel,
  inviteEmail,
  onInviteEmail,
  onCreateInvite
}: {
  activeChannel: Channel | null;
  isAdmin: boolean;
  onDraft: () => void;
  onPrepareChannel: () => void;
  inviteEmail: string;
  onInviteEmail: (value: string) => void;
  onCreateInvite: () => void;
}) {
  const isGeneral = activeChannel?.name === "general";
  return (
    <div className="flex h-full items-center px-8">
      <div className="max-w-md">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          {isGeneral ? "First run" : "Empty channel"}
        </p>
        <h2 className="text-sm font-medium">{isGeneral ? "Start #general" : "No messages yet"}</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          {isGeneral
            ? "Post the first update, invite teammates, or create a focused channel. Keep it short, the workspace is ready."
            : "Send the first message or use this channel when the topic is ready."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={onDraft}>
            Draft update
          </Button>
          <Button size="sm" variant="ghost" onClick={onPrepareChannel}>
            Prepare channel
          </Button>
        </div>
        {isAdmin ? (
          <div className="mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-1">
            <Input
              density="compact"
              value={inviteEmail}
              onChange={(event) => onInviteEmail(event.target.value)}
              placeholder="person@company.com"
            />
            <Button size="sm" variant="ghost" onClick={onCreateInvite}>
              Invite
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewMessagesDivider() {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="h-px flex-1 bg-[var(--danger)] opacity-40" />
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--danger)]">New</span>
    </div>
  );
}

export function ChannelBody({
  messages,
  activeChannel,
  isAdmin,
  currentUserId,
  onReact,
  onThread,
  onEdit,
  onDelete,
  firstUnreadId,
  onDraft,
  onPrepareChannel,
  inviteEmail,
  onInviteEmail,
  onCreateInvite
}: {
  messages: ChatMessage[];
  activeChannel: Channel | null;
  isAdmin: boolean;
  currentUserId?: string;
  onReact: (message: ChatMessage, emoji: string) => void;
  onThread: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage, nextBody: string) => void;
  onDelete?: (message: ChatMessage) => void;
  firstUnreadId?: string | null;
  onDraft: () => void;
  onPrepareChannel: () => void;
  inviteEmail: string;
  onInviteEmail: (value: string) => void;
  onCreateInvite: () => void;
}) {
  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
      {messages.length === 0 ? (
        <ChannelEmptyState
          activeChannel={activeChannel}
          isAdmin={isAdmin}
          onDraft={onDraft}
          onPrepareChannel={onPrepareChannel}
          inviteEmail={inviteEmail}
          onInviteEmail={onInviteEmail}
          onCreateInvite={onCreateInvite}
        />
      ) : (
        <div>
          {messages.map((message) => (
            <div key={message.id}>
              {message.id === firstUnreadId ? <NewMessagesDivider /> : null}
              <MessageRow
                message={message}
                currentUserId={currentUserId}
                onReact={onReact}
                onThread={onThread}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchOverlay({
  open,
  query,
  onQuery,
  onClose,
  hits,
  onSelect
}: {
  open: boolean;
  query: string;
  onQuery: (value: string) => void;
  onClose: () => void;
  hits: SearchHit[];
  onSelect: (channelId: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4" onMouseDown={onClose}>
      <div
        className="mx-auto mt-20 max-w-2xl overflow-hidden rounded-[6px] border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl shadow-black/40"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-3">
          <Search size={14} className="text-[var(--muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search messages"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--faint)]"
          />
          <button onClick={onClose} className="font-mono text-[10px] uppercase text-[var(--faint)]">
            esc
          </button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-1">
          {hits.map((hit) => (
            <button
              key={hit.id}
              onClick={() => onSelect(hit.channel_id)}
              className="grid w-full grid-cols-[120px_1fr_80px] gap-3 rounded-[4px] px-2 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
            >
              <span className="truncate text-[var(--muted)]">#{hit.channel_name ?? "dm"}</span>
              <span className="truncate text-[var(--text)]">{hit.body}</span>
              <span className="text-right font-mono text-[10px] text-[var(--faint)]">{formatTime(hit.created_at)}</span>
            </button>
          ))}
          {!hits.length ? <p className="p-6 text-center text-xs text-[var(--faint)]">Type to search</p> : null}
        </div>
      </div>
    </div>
  );
}

function MessageActions({
  message,
  isOwn,
  onReact,
  onThread,
  onEdit,
  onDelete
}: {
  message: ChatMessage;
  isOwn: boolean;
  onReact: (message: ChatMessage, emoji: string) => void;
  onThread: (message: ChatMessage) => void;
  onEdit?: () => void;
  onDelete?: (message: ChatMessage) => void;
}) {
  return (
    <div className="ml-auto hidden items-center gap-1 group-hover:flex">
      {emojiQuick.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(message, emoji)}
          className="grid h-5 w-5 place-items-center rounded-[4px] border border-[var(--line)] text-[11px] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
        >
          {emoji}
        </button>
      ))}
      <ReactionPicker onSelect={(emoji) => onReact(message, emoji)} />
      <button
        onClick={() => onThread(message)}
        className="h-5 rounded-[4px] border border-[var(--line)] px-1.5 font-mono text-[10px] uppercase text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
      >
        reply
      </button>
      {isOwn && onEdit ? (
        <button
          onClick={onEdit}
          className="grid h-5 w-5 place-items-center rounded-[4px] border border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
          aria-label="Edit message"
        >
          <Pencil size={11} />
        </button>
      ) : null}
      {isOwn && onDelete ? (
        <button
          onClick={() => onDelete(message)}
          className="grid h-5 w-5 place-items-center rounded-[4px] border border-[var(--line)] text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
          aria-label="Delete message"
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </div>
  );
}

function MessageEditor({
  initial,
  onSave,
  onCancel
}: {
  initial: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const save = () => {
    if (draft.trim()) onSave(draft);
  };

  return (
    <div className="mt-1 space-y-1">
      <Textarea
        density="compact"
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save();
        }}
        rows={2}
      />
      <div className="flex items-center gap-1.5 text-[10px]">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <span className="text-[var(--faint)]">Esc to cancel</span>
      </div>
    </div>
  );
}

export function MessageRow({
  message,
  currentUserId,
  onReact,
  onThread,
  onEdit,
  onDelete,
  compact = false
}: {
  message: ChatMessage;
  currentUserId?: string;
  onReact: (message: ChatMessage, emoji: string) => void;
  onThread: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage, nextBody: string) => void;
  onDelete?: (message: ChatMessage) => void;
  compact?: boolean;
}) {
  const author =
    message.profiles?.display_name ??
    message.profiles?.email ??
    (message.author_id === currentUserId ? "You" : "Unknown");
  const isOwn = message.author_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const groupedReactions = new Map<string, number>();
  message.reactions?.forEach((reaction) =>
    groupedReactions.set(reaction.emoji, (groupedReactions.get(reaction.emoji) ?? 0) + 1)
  );

  return (
    <article
      className={cn(
        "group grid grid-cols-[58px_26px_minmax(0,1fr)] gap-2 px-3 py-1.5 hover:bg-[var(--surface-hover)]",
        message.pending && "opacity-70",
        message.failed && "bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]",
        compact && "grid-cols-[42px_24px_minmax(0,1fr)] px-2"
      )}
    >
      <time className="pt-1 font-mono text-[10px] text-[var(--faint)]">{formatTime(message.created_at)}</time>
      <Avatar name={author} />
      <div className="min-w-0">
        <div className="flex h-5 items-center gap-2">
          <span className="truncate text-xs font-medium text-[var(--text)]">{author}</span>
          {message.pending ? <span className="font-mono text-[10px] uppercase text-[var(--warn)]">sending</span> : null}
          {message.failed ? <span className="font-mono text-[10px] uppercase text-[var(--danger)]">failed</span> : null}
          <MessageActions
            message={message}
            isOwn={isOwn}
            onReact={onReact}
            onThread={onThread}
            onEdit={onEdit ? () => setEditing(true) : undefined}
            onDelete={onDelete}
          />
        </div>
        {editing ? (
          <MessageEditor
            initial={message.body}
            onCancel={() => setEditing(false)}
            onSave={(value) => {
              onEdit?.(message, value);
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-baseline">
            <MessageBody body={message.body} />
            {message.edited_at ? <span className="ml-1 text-[10px] text-[var(--faint)]">(edited)</span> : null}
          </div>
        )}
        {message.attachments?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-[var(--line)] px-1.5 text-[11px] text-[var(--muted)]"
              >
                <Paperclip size={11} /> {attachment.file_name}
              </span>
            ))}
          </div>
        ) : null}
        {groupedReactions.size ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...groupedReactions].map(([emoji, count]) => (
              <span
                key={emoji}
                className="rounded-[4px] border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]"
              >
                {displayEmoji(emoji)} {count}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  file,
  onFile,
  dense = false
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  file?: File | null;
  onFile?: (file: File | null) => void;
  dense?: boolean;
}) {
  return (
    <div className={cn("border-t border-[var(--line)] bg-[var(--surface-0)] p-2", dense && "p-2")}>
      {file ? (
        <div className="mb-1 flex h-7 items-center justify-between rounded-[5px] border border-[var(--line)] px-2 text-[11px] text-[var(--muted)]">
          <span className="truncate">{file.name}</span>
          <button onClick={() => onFile?.(null)} className="text-[var(--faint)] hover:text-[var(--text)]">
            Remove
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-1.5 focus-within:border-[var(--accent)]">
        <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
          <Paperclip size={14} />
          <input className="hidden" type="file" onChange={(event) => onFile?.(event.target.files?.[0] ?? null)} />
        </label>
        <Textarea
          density="compact"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSend();
          }}
          placeholder="Message"
          rows={dense ? 2 : 1}
          className="min-h-7 border-0 bg-transparent px-1 py-1.5 focus:ring-0"
        />
        <Button onClick={onSend} size="icon" className="h-7 w-7" aria-label="Send">
          <Send size={13} />
        </Button>
      </div>
    </div>
  );
}
