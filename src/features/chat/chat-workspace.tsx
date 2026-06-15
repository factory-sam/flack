"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Channel, ChatMessage, Profile, SearchHit } from "@/types/chat";
import { markMessageFailed, mergeIncomingMessage, removeMessage } from "@/features/messages/optimistic";
import { ChannelBody, ChannelHeader, Composer, MessageRow, SearchOverlay } from "@/features/chat/chat-parts";
import { useChannelRealtime, type TypingState } from "@/features/chat/use-channel-realtime";
import { WorkspaceSidebar } from "@/features/chat/workspace-sidebar";
import { useUnread } from "@/features/chat/use-unread";
import { firstUnreadId } from "@/features/chat/unread";
import { useNotifications } from "@/features/chat/use-notifications";
import { NotificationBell } from "@/features/chat/notification-bell";

function buildOptimisticMessage(args: {
  id: string;
  channelId: string;
  user: User;
  profile: Profile | null;
  text: string;
  file: File | null;
  parentId: string | null;
  now: string;
}): ChatMessage {
  const { id, channelId, user, profile, text, file, parentId, now } = args;
  return {
    id,
    channel_id: channelId,
    author_id: user.id,
    body: text || file?.name || "Attachment",
    parent_id: parentId,
    edited_at: null,
    deleted_at: null,
    created_at: now,
    pending: true,
    profiles: {
      display_name: profile?.display_name ?? user.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      email: user.email ?? null
    },
    attachments: file
      ? [{ id: "local", message_id: id, storage_path: "", file_name: file.name, mime: file.type, size: file.size }]
      : []
  };
}

export function ChatWorkspace() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<TypingState>({});
  const [onlineCount, setOnlineCount] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [dividerLastRead, setDividerLastRead] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const lastReadRef = useRef<Record<string, string | null>>({});
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;
  const { unreadCounts, refreshUnread, markChannelRead } = useUnread(supabase, user?.id);
  const { notifications, markAllRead } = useNotifications(supabase, user?.id, refreshUnread);
  const firstUnread = firstUnreadId(messages, dividerLastRead, user?.id);

  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("id,org_id,type,name,topic,created_at,channel_members(user_id,role,last_read_at)")
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    const next = (data ?? []) as unknown as Channel[];
    setChannels(next);
    setActiveChannelId(
      (current) => current ?? next.find((channel) => channel.name === "general")?.id ?? next[0]?.id ?? null
    );
  }, [supabase]);

  const fetchMessages = useCallback(
    async (channelId: string, parentId: string | null = null) => {
      let query = supabase
        .from("messages")
        .select(
          "id,channel_id,author_id,body,parent_id,edited_at,deleted_at,created_at,profiles:profiles!messages_author_id_fkey(display_name,avatar_url,email),reactions(message_id,user_id,emoji),attachments(id,message_id,storage_path,file_name,mime,size)"
        )
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(80);

      query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
    [supabase]
  );

  useEffect(() => {
    let live = true;

    async function boot() {
      try {
        const {
          data: { user: authUser }
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/login");
          return;
        }

        const profileColumns =
          "id,org_id,email,display_name,avatar_url,status,status_emoji,status_text,status_expires_at,presence,role,last_seen_at";
        const { data: profileData } = await supabase
          .from("profiles")
          .select(profileColumns)
          .eq("id", authUser.id)
          .single();
        const typedProfile = profileData as unknown as Profile | null;
        const { data: memberData } = typedProfile
          ? await supabase
              .from("profiles")
              .select(profileColumns)
              .eq("org_id", typedProfile.org_id)
              .order("display_name", { ascending: true })
          : { data: [] };
        if (!live) return;
        setUser(authUser);
        setProfile(typedProfile);
        setMembers((memberData ?? []) as unknown as Profile[]);
        await fetchChannels();
        await refreshUnread();
      } finally {
        if (live) setLoading(false);
      }
    }

    boot();
    return () => {
      live = false;
    };
  }, [fetchChannels, refreshUnread, router, supabase]);

  useEffect(() => {
    for (const channel of channels) {
      if (!(channel.id in lastReadRef.current)) {
        lastReadRef.current[channel.id] =
          channel.channel_members?.find((member) => member.user_id === user?.id)?.last_read_at ?? null;
      }
    }
  }, [channels, user?.id]);

  useEffect(() => {
    if (!activeChannelId) return;
    let live = true;

    setDividerLastRead(lastReadRef.current[activeChannelId] ?? null);
    fetchMessages(activeChannelId).then((data) => {
      if (live) setMessages(data);
    });

    const now = new Date().toISOString();
    lastReadRef.current[activeChannelId] = now;
    void markChannelRead(activeChannelId, now);

    return () => {
      live = false;
    };
  }, [activeChannelId, fetchMessages, markChannelRead]);

  useChannelRealtime({
    supabase,
    activeChannelId,
    user,
    displayName: profile?.display_name,
    fetchMessages,
    setMessages,
    setTyping,
    setOnlineCount,
    channelRef: realtimeChannel
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      const clear = window.setTimeout(() => setSearchHits([]), 0);
      return () => window.clearTimeout(clear);
    }

    const timeout = window.setTimeout(async () => {
      const { data } = await supabase.rpc("search_messages", { query_text: searchQuery, limit_count: 12 });
      setSearchHits((data ?? []) as SearchHit[]);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, supabase]);

  async function createChannel(type: "public" | "private") {
    if (!user || !profile) return;
    const name = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    if (!name) return;

    const { data, error } = await supabase
      .from("channels")
      .insert({ org_id: profile.org_id, name, type, topic: null, created_by: user.id })
      .select("id,type,name,topic,created_at")
      .single();
    if (!error && data) {
      await supabase.from("channel_members").insert({ channel_id: data.id, user_id: user.id, role: "owner" });
      setNewChannelName("");
      await fetchChannels();
      setActiveChannelId(data.id);
    }
  }

  async function createDm(targetId: string) {
    if (!user || !profile || targetId === user.id) return;
    const name = [user.id, targetId].sort().join(":");
    const { data, error } = await supabase
      .from("channels")
      .insert({ org_id: profile.org_id, type: "dm", name, created_by: user.id })
      .select("id,type,name,topic,created_at")
      .single();
    if (!error && data) {
      await supabase.from("channel_members").insert([
        { channel_id: data.id, user_id: user.id, role: "owner" },
        { channel_id: data.id, user_id: targetId, role: "member" }
      ]);
      await fetchChannels();
      setActiveChannelId(data.id);
    }
  }

  async function createInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || profile?.role !== "admin") return;

    setInviteMessage(null);
    setInviteLink(null);

    const { data, error } = await supabase.rpc("create_invite", { invite_email: email, invite_role: "member" });
    if (error) {
      setInviteMessage(error.message);
      return;
    }

    const token = data?.[0]?.token;
    if (!token) {
      setInviteMessage("Invite created, but no token was returned.");
      return;
    }

    const url = `${window.location.origin}/invite/${token}`;
    setInviteLink(url);
    setInviteEmail("");
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function broadcastTyping() {
    if (!activeChannelId || !user) return;
    if (typingTimer.current) return;
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
    }, 2500);
    realtimeChannel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id, name: profile?.display_name ?? user.email }
    });
  }

  async function uploadAttachment(messageId: string) {
    if (!file || !activeChannelId) return null;
    const path = `${activeChannelId}/${messageId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
    if (error) throw error;
    await supabase
      .from("attachments")
      .insert({ message_id: messageId, storage_path: path, file_name: file.name, mime: file.type, size: file.size });
    return {
      id: crypto.randomUUID(),
      message_id: messageId,
      storage_path: path,
      file_name: file.name,
      mime: file.type,
      size: file.size
    };
  }

  async function sendMessage(parentId: string | null = null) {
    if (!activeChannelId || !user) return;
    const text = (parentId ? threadBody : body).trim();
    if (!text && !file) return;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic = buildOptimisticMessage({
      id,
      channelId: activeChannelId,
      user,
      profile,
      text,
      file,
      parentId,
      now
    });

    if (parentId) {
      setThreadMessages((current) => mergeIncomingMessage(current, optimistic));
      setThreadBody("");
    } else {
      setMessages((current) => mergeIncomingMessage(current, optimistic));
      setBody("");
    }

    try {
      const attachment = await uploadAttachment(id);
      const { error } = await supabase
        .from("messages")
        .insert({ id, channel_id: activeChannelId, author_id: user.id, body: optimistic.body, parent_id: parentId });
      if (error) throw error;
      if (attachment) setFile(null);
      await supabase
        .from("channel_members")
        .update({ last_read_at: now })
        .eq("channel_id", activeChannelId)
        .eq("user_id", user.id);
    } catch {
      if (parentId) {
        setThreadMessages((current) => markMessageFailed(current, id));
      } else {
        setMessages((current) => markMessageFailed(current, id));
      }
    }
  }

  async function toggleReaction(message: ChatMessage, emoji: string) {
    if (!user) return;
    const existing = message.reactions?.some((reaction) => reaction.user_id === user.id && reaction.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("message_id", message.id).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({ message_id: message.id, user_id: user.id, emoji });
    }
    if (activeChannelId) setMessages(await fetchMessages(activeChannelId));
  }

  async function editMessage(message: ChatMessage, nextBody: string) {
    const text = nextBody.trim();
    if (!user || !text || text === message.body) return;
    const now = new Date().toISOString();
    const apply = (list: ChatMessage[]) =>
      list.map((item) => (item.id === message.id ? { ...item, body: text, edited_at: now } : item));
    setMessages(apply);
    setThreadMessages(apply);
    setThreadRoot((current) => (current?.id === message.id ? { ...current, body: text, edited_at: now } : current));
    await supabase.from("messages").update({ body: text, edited_at: now }).eq("id", message.id);
  }

  async function deleteMessage(message: ChatMessage) {
    if (!user) return;
    setMessages((current) => removeMessage(current, message.id));
    setThreadMessages((current) => removeMessage(current, message.id));
    await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", message.id);
  }

  async function openThread(message: ChatMessage) {
    setThreadRoot(message);
    setThreadMessages(await fetchMessages(message.channel_id, message.id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  const typingNames = Object.values(typing).map((item) => item.name);
  const publicChannels = channels.filter((channel) => channel.type !== "dm");
  const dms = channels.filter((channel) => channel.type === "dm");

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-xs text-[var(--muted)]">Loading</div>
    );
  }

  return (
    <main className="grid h-screen grid-cols-[248px_minmax(0,1fr)] overflow-hidden bg-[var(--bg)] text-[var(--text)] lg:grid-cols-[248px_minmax(0,1fr)_360px]">
      <WorkspaceSidebar
        profile={profile}
        user={user}
        onSignOut={signOut}
        onOpenSearch={() => setSearchOpen(true)}
        inviteEmail={inviteEmail}
        onInviteEmail={setInviteEmail}
        onCreateInvite={createInvite}
        inviteLink={inviteLink}
        inviteMessage={inviteMessage}
        publicChannels={publicChannels}
        dms={dms}
        members={members}
        activeChannelId={activeChannelId}
        unreadCounts={unreadCounts}
        onSelectChannel={setActiveChannelId}
        newChannelName={newChannelName}
        onNewChannelName={setNewChannelName}
        onCreateChannel={() => createChannel("public")}
        onCreateDm={createDm}
      />

      <section className="flex min-w-0 flex-col">
        <ChannelHeader
          activeChannel={activeChannel}
          onlineCount={onlineCount}
          messageCount={messages.length}
          actions={
            <NotificationBell notifications={notifications} onMarkAllRead={markAllRead} onSelect={setActiveChannelId} />
          }
        />

        <ChannelBody
          messages={messages}
          activeChannel={activeChannel}
          isAdmin={profile?.role === "admin"}
          currentUserId={user?.id}
          onReact={toggleReaction}
          onThread={openThread}
          onEdit={editMessage}
          onDelete={deleteMessage}
          firstUnreadId={firstUnread}
          onDraft={() => setBody("First update: ")}
          onPrepareChannel={() => setNewChannelName("team-updates")}
          inviteEmail={inviteEmail}
          onInviteEmail={setInviteEmail}
          onCreateInvite={createInvite}
        />

        {typingNames.length ? (
          <div className="border-t border-[var(--line)] px-4 py-1 text-[11px] text-[var(--muted)]">
            {typingNames.slice(0, 2).join(", ")} typing
          </div>
        ) : null}
        <Composer
          value={body}
          onChange={(value) => {
            setBody(value);
            broadcastTyping();
          }}
          onSend={() => sendMessage(null)}
          file={file}
          onFile={setFile}
        />
      </section>

      <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] bg-[var(--surface)] lg:flex">
        {threadRoot ? (
          <>
            <div className="flex h-11 items-center justify-between border-b border-[var(--line)] px-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Thread</span>
              <button
                onClick={() => setThreadRoot(null)}
                className="grid h-7 w-7 place-items-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                aria-label="Close thread"
              >
                <X size={13} />
              </button>
            </div>
            <div className="border-b border-[var(--line)] p-3">
              <p className="max-h-20 overflow-hidden text-xs leading-5 text-[var(--text)]">{threadRoot.body}</p>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
              {threadMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  currentUserId={user?.id}
                  onReact={toggleReaction}
                  onThread={openThread}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  compact
                />
              ))}
            </div>
            <Composer value={threadBody} onChange={setThreadBody} onSend={() => sendMessage(threadRoot.id)} dense />
          </>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex h-11 items-center border-b border-[var(--line)] px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Thread
            </div>
            <div className="grid flex-1 place-items-center px-6 text-center text-xs text-[var(--faint)]">
              Select a message
            </div>
          </div>
        )}
      </aside>

      <SearchOverlay
        open={searchOpen}
        query={searchQuery}
        onQuery={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        hits={searchHits}
        onSelect={(channelId) => {
          setActiveChannelId(channelId);
          setSearchOpen(false);
        }}
      />
    </main>
  );
}
