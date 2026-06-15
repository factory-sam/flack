"use client";

import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Hash, LogOut, MessageSquare, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Channel, Profile } from "@/types/chat";
import { AdminSetupPanel, Avatar, ChannelButton, CurrentUserBadge, SectionTitle } from "@/features/chat/chat-parts";
import { presenceDotClass, statusActive } from "@/features/chat/status";
import { useNow } from "@/features/chat/use-now";

export function WorkspaceSidebar({
  profile,
  user,
  onSignOut,
  onOpenSearch,
  inviteEmail,
  onInviteEmail,
  onCreateInvite,
  inviteLink,
  inviteMessage,
  publicChannels,
  dms,
  members,
  activeChannelId,
  unreadCounts,
  onSelectChannel,
  newChannelName,
  onNewChannelName,
  onCreateChannel,
  onCreateDm,
  footer
}: {
  profile: Profile | null;
  user: User | null;
  onSignOut: () => void;
  onOpenSearch: () => void;
  inviteEmail: string;
  onInviteEmail: (value: string) => void;
  onCreateInvite: () => void;
  inviteLink: string | null;
  inviteMessage: string | null;
  publicChannels: Channel[];
  dms: Channel[];
  members: Profile[];
  activeChannelId: string | null;
  unreadCounts: Record<string, number>;
  onSelectChannel: (channelId: string) => void;
  newChannelName: string;
  onNewChannelName: (value: string) => void;
  onCreateChannel: () => void;
  onCreateDm: (targetId: string) => void;
  footer?: ReactNode;
}) {
  const now = useNow();
  return (
    <aside className="flex min-h-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
      <div className="flex h-11 items-center justify-between border-b border-[var(--line)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" />
          <span className="truncate text-sm font-medium tracking-tight">Flack</span>
        </div>
        <button
          onClick={onSignOut}
          className="grid h-7 w-7 place-items-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>

      <div className="border-b border-[var(--line)] p-2">
        <button
          onClick={onOpenSearch}
          className="flex h-8 w-full items-center justify-between rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] px-2 text-xs text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
        >
          <span className="flex items-center gap-2">
            <Search size={13} /> Search
          </span>
          <span className="font-mono text-[10px] text-[var(--faint)]">⌘K</span>
        </button>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <AdminSetupPanel
          visible={profile?.role === "admin"}
          inviteEmail={inviteEmail}
          onInviteEmail={onInviteEmail}
          onCreateInvite={onCreateInvite}
          inviteLink={inviteLink}
          inviteMessage={inviteMessage}
        />

        <SectionTitle icon={<Hash size={12} />} label="Channels" />
        <div className="space-y-px">
          {publicChannels.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              active={channel.id === activeChannelId}
              unread={unreadCounts[channel.id] ?? 0}
              onClick={() => onSelectChannel(channel.id)}
            />
          ))}
        </div>

        <div className="mt-2 flex gap-1">
          <Input
            density="compact"
            value={newChannelName}
            onChange={(event) => onNewChannelName(event.target.value)}
            placeholder="channel"
          />
          <Button size="icon" variant="ghost" onClick={onCreateChannel} aria-label="Create channel">
            <Plus size={13} />
          </Button>
        </div>

        <SectionTitle className="mt-4" icon={<MessageSquare size={12} />} label="DMs" />
        <div className="space-y-px">
          {dms.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              active={channel.id === activeChannelId}
              unread={unreadCounts[channel.id] ?? 0}
              onClick={() => onSelectChannel(channel.id)}
            />
          ))}
        </div>

        <SectionTitle className="mt-4" icon={<Users size={12} />} label="People" />
        <div className="space-y-px">
          {members
            .filter((member) => member.id !== user?.id)
            .slice(0, 10)
            .map((member) => (
              <button
                key={member.id}
                onClick={() => onCreateDm(member.id)}
                className="flex h-7 w-full items-center gap-2 rounded-[5px] px-1.5 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <span className="relative">
                  <Avatar name={member.display_name ?? member.email ?? "Member"} size="sm" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--surface)] ${presenceDotClass(member.presence)}`}
                  />
                </span>
                <span className="truncate">{member.display_name ?? member.email}</span>
                {statusActive(member, now) && member.status_emoji ? (
                  <span className="ml-auto text-xs">{member.status_emoji}</span>
                ) : null}
              </button>
            ))}
        </div>
      </div>

      {footer ?? <CurrentUserBadge profile={profile} user={user} />}
    </aside>
  );
}
