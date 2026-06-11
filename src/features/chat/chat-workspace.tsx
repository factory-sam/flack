"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Lock, LogOut, MessageSquare, Paperclip, Plus, Search, Send, Users, X } from "lucide-react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { channelLabel, cn, formatTime, initials } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Channel, ChatMessage, Profile, SearchHit } from "@/types/chat";
import { markMessageFailed, mergeIncomingMessage } from "@/features/messages/optimistic";

const emojiQuick = ["+1", "eyes", "check"];

type TypingState = Record<string, { name: string; at: number }>;

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

function displayEmoji(token: string) {
  if (token === "+1") return "👍";
  if (token === "eyes") return "👀";
  if (token === "check") return "✓";
  return token;
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
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;

  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase.from("channels").select("id,org_id,type,name,topic,created_at,channel_members(user_id,role,last_read_at)").order("type", { ascending: true }).order("name", { ascending: true });
    if (error) throw error;
    const next = (data ?? []) as unknown as Channel[];
    setChannels(next);
    setActiveChannelId((current) => current ?? next.find((channel) => channel.name === "general")?.id ?? next[0]?.id ?? null);
  }, [supabase]);

  const fetchMessages = useCallback(
    async (channelId: string, parentId: string | null = null) => {
      let query = supabase
        .from("messages")
        .select("id,channel_id,author_id,body,parent_id,edited_at,deleted_at,created_at,profiles:profiles!messages_author_id_fkey(display_name,avatar_url,email),reactions(message_id,user_id,emoji),attachments(id,message_id,storage_path,file_name,mime,size)")
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

        const { data: profileData } = await supabase.from("profiles").select("id,org_id,email,display_name,avatar_url,status,role,last_seen_at").eq("id", authUser.id).single();
        const typedProfile = profileData as unknown as Profile | null;
        const { data: memberData } = typedProfile
          ? await supabase.from("profiles").select("id,org_id,email,display_name,avatar_url,status,role,last_seen_at").eq("org_id", typedProfile.org_id).order("display_name", { ascending: true })
          : { data: [] };
        if (!live) return;
        setUser(authUser);
        setProfile(typedProfile);
        setMembers((memberData ?? []) as unknown as Profile[]);
        await fetchChannels();
      } finally {
        if (live) setLoading(false);
      }
    }

    boot();
    return () => {
      live = false;
    };
  }, [fetchChannels, router, supabase]);

  useEffect(() => {
    if (!activeChannelId) return;
    let live = true;

    fetchMessages(activeChannelId).then((data) => {
      if (live) setMessages(data);
    });

    return () => {
      live = false;
    };
  }, [activeChannelId, fetchMessages]);

  useEffect(() => {
    if (!activeChannelId || !user) return;

    const channel: RealtimeChannel = supabase.channel(`channel:${activeChannelId}`, {
      config: {
        private: true,
        broadcast: { self: true },
        presence: { key: user.id }
      }
    });

    realtimeChannel.current = channel;

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
        setMessages((current) => mergeIncomingMessage(current, record));
      })
      .on("broadcast", { event: "DELETE" }, ({ payload }) => {
        if (payload.table === "reactions") {
          fetchMessages(activeChannelId).then(setMessages);
          return;
        }

        const oldRecord = payloadOldRecord(payload);
        if (!oldRecord || oldRecord.channel_id !== activeChannelId) return;
        setMessages((current) => current.filter((message) => message.id !== oldRecord.id));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.user_id === user.id) return;
        setTyping((current) => ({ ...current, [payload.user_id]: { name: payload.name ?? "Someone", at: Date.now() } }));
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, name: profile?.display_name ?? user.email, online_at: new Date().toISOString() });
        }
      });

    const cleanupTyping = window.setInterval(() => {
      const now = Date.now();
      setTyping((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => now - value.at < 3500)));
    }, 1500);

    return () => {
      window.clearInterval(cleanupTyping);
      realtimeChannel.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, fetchMessages, profile?.display_name, supabase, user]);

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
      setSearchHits([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const { data } = await supabase.rpc("search_messages", { query_text: searchQuery, limit_count: 12 });
      setSearchHits((data ?? []) as SearchHit[]);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, supabase]);

  async function createChannel(type: "public" | "private") {
    if (!user || !profile) return;
    const name = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!name) return;

    const { data, error } = await supabase.from("channels").insert({ org_id: profile.org_id, name, type, topic: null, created_by: user.id }).select("id,type,name,topic,created_at").single();
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
    const { data, error } = await supabase.from("channels").insert({ org_id: profile.org_id, type: "dm", name, created_by: user.id }).select("id,type,name,topic,created_at").single();
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
    realtimeChannel.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user.id, name: profile?.display_name ?? user.email } });
  }

  async function uploadAttachment(messageId: string) {
    if (!file || !activeChannelId) return null;
    const path = `${activeChannelId}/${messageId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
    if (error) throw error;
    await supabase.from("attachments").insert({ message_id: messageId, storage_path: path, file_name: file.name, mime: file.type, size: file.size });
    return { id: crypto.randomUUID(), message_id: messageId, storage_path: path, file_name: file.name, mime: file.type, size: file.size };
  }

  async function sendMessage(parentId: string | null = null) {
    if (!activeChannelId || !user) return;
    const text = (parentId ? threadBody : body).trim();
    if (!text && !file) return;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: ChatMessage = {
      id,
      channel_id: activeChannelId,
      author_id: user.id,
      body: text || file?.name || "Attachment",
      parent_id: parentId,
      edited_at: null,
      deleted_at: null,
      created_at: now,
      pending: true,
      profiles: { display_name: profile?.display_name ?? user.email ?? null, avatar_url: profile?.avatar_url ?? null, email: user.email ?? null },
      attachments: file ? [{ id: "local", message_id: id, storage_path: "", file_name: file.name, mime: file.type, size: file.size }] : []
    };

    if (parentId) {
      setThreadMessages((current) => mergeIncomingMessage(current, optimistic));
      setThreadBody("");
    } else {
      setMessages((current) => mergeIncomingMessage(current, optimistic));
      setBody("");
    }

    try {
      const attachment = await uploadAttachment(id);
      const { error } = await supabase.from("messages").insert({ id, channel_id: activeChannelId, author_id: user.id, body: optimistic.body, parent_id: parentId });
      if (error) throw error;
      if (attachment) setFile(null);
      await supabase.from("channel_members").update({ last_read_at: now }).eq("channel_id", activeChannelId).eq("user_id", user.id);
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
    return <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-xs text-[var(--muted)]">Loading</div>;
  }

  return (
    <main className="grid h-screen grid-cols-[248px_minmax(0,1fr)] overflow-hidden bg-[var(--bg)] text-[var(--text)] lg:grid-cols-[248px_minmax(0,1fr)_360px]">
      <aside className="flex min-h-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
        <div className="flex h-11 items-center justify-between border-b border-[var(--line)] px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" />
            <span className="truncate text-sm font-medium tracking-tight">Flack</span>
          </div>
          <button onClick={signOut} className="grid h-7 w-7 place-items-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>

        <div className="border-b border-[var(--line)] p-2">
          <button onClick={() => setSearchOpen(true)} className="flex h-8 w-full items-center justify-between rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] px-2 text-xs text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]">
            <span className="flex items-center gap-2"><Search size={13} /> Search</span>
            <span className="font-mono text-[10px] text-[var(--faint)]">⌘K</span>
          </button>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {profile?.role === "admin" ? (
            <div className="mb-4 border-b border-[var(--line)] pb-3">
              <SectionTitle icon={<Plus size={12} />} label="Setup" />
              <div className="space-y-1.5">
                <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">Invite the first teammate. Links expire after 7 days.</p>
                <div className="flex gap-1">
                  <Input density="compact" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="person@company.com" />
                  <Button size="icon" variant="ghost" onClick={createInvite} aria-label="Create invite">
                    <Plus size={13} />
                  </Button>
                </div>
                {inviteLink ? <p className="break-all rounded-[4px] border border-[var(--line)] p-1.5 text-[10px] leading-4 text-[var(--muted)]">Copied: {inviteLink}</p> : null}
                {inviteMessage ? <p className="px-1 text-[10px] leading-4 text-[var(--danger)]">{inviteMessage}</p> : null}
              </div>
            </div>
          ) : null}

          <SectionTitle icon={<Hash size={12} />} label="Channels" />
          <div className="space-y-px">
            {publicChannels.map((channel) => (
              <ChannelButton key={channel.id} channel={channel} active={channel.id === activeChannelId} onClick={() => setActiveChannelId(channel.id)} />
            ))}
          </div>

          <div className="mt-2 flex gap-1">
            <Input density="compact" value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} placeholder="channel" />
            <Button size="icon" variant="ghost" onClick={() => createChannel("public")} aria-label="Create channel">
              <Plus size={13} />
            </Button>
          </div>

          <SectionTitle className="mt-4" icon={<MessageSquare size={12} />} label="DMs" />
          <div className="space-y-px">
            {dms.map((channel) => (
              <ChannelButton key={channel.id} channel={channel} active={channel.id === activeChannelId} onClick={() => setActiveChannelId(channel.id)} />
            ))}
          </div>

          <SectionTitle className="mt-4" icon={<Users size={12} />} label="People" />
          <div className="space-y-px">
            {members.filter((member) => member.id !== user?.id).slice(0, 10).map((member) => (
              <button key={member.id} onClick={() => createDm(member.id)} className="flex h-7 w-full items-center gap-2 rounded-[5px] px-1.5 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                <Avatar name={member.display_name ?? member.email ?? "Member"} size="sm" />
                <span className="truncate">{member.display_name ?? member.email}</span>
              </button>
            ))}
          </div>

        </div>

        <div className="border-t border-[var(--line)] px-2 py-2">
          <div className="flex items-center gap-2 px-1">
            <Avatar name={profile?.display_name ?? user?.email ?? "Me"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{profile?.display_name ?? user?.email}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">{profile?.role ?? "member"}</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex h-11 items-center justify-between border-b border-[var(--line)] bg-[var(--surface-0)] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <ChannelIcon channel={activeChannel} />
            <h1 className="truncate text-sm font-medium">{activeChannel ? channelLabel(activeChannel.name, activeChannel.type) : "No channel"}</h1>
            {activeChannel?.topic ? <span className="hidden truncate border-l border-[var(--line)] pl-2 text-xs text-[var(--muted)] md:block">{activeChannel.topic}</span> : null}
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
            <span>{onlineCount} online</span>
            <span>{messages.length} messages</span>
          </div>
        </header>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
          {messages.length === 0 ? (
            <div className="flex h-full items-center px-8">
              <div className="max-w-md">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">{activeChannel?.name === "general" ? "First run" : "Empty channel"}</p>
                <h2 className="text-sm font-medium">{activeChannel?.name === "general" ? "Start #general" : "No messages yet"}</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {activeChannel?.name === "general"
                    ? "Post the first update, invite teammates, or create a focused channel. Keep it short, the workspace is ready."
                    : "Send the first message or use this channel when the topic is ready."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setBody("First update: ")}>Draft update</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewChannelName("team-updates")}>Prepare channel</Button>
                </div>
                {profile?.role === "admin" ? (
                  <div className="mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-1">
                    <Input density="compact" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="person@company.com" />
                    <Button size="sm" variant="ghost" onClick={createInvite}>Invite</Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} currentUserId={user?.id} onReact={toggleReaction} onThread={openThread} />
              ))}
            </div>
          )}
        </div>

        {typingNames.length ? <div className="border-t border-[var(--line)] px-4 py-1 text-[11px] text-[var(--muted)]">{typingNames.slice(0, 2).join(", ")} typing</div> : null}
        <Composer value={body} onChange={(value) => { setBody(value); broadcastTyping(); }} onSend={() => sendMessage(null)} file={file} onFile={setFile} />
      </section>

      <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] bg-[var(--surface)] lg:flex">
        {threadRoot ? (
          <>
            <div className="flex h-11 items-center justify-between border-b border-[var(--line)] px-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Thread</span>
              <button onClick={() => setThreadRoot(null)} className="grid h-7 w-7 place-items-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Close thread">
                <X size={13} />
              </button>
            </div>
            <div className="border-b border-[var(--line)] p-3">
              <p className="max-h-20 overflow-hidden text-xs leading-5 text-[var(--text)]">{threadRoot.body}</p>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
              {threadMessages.map((message) => <MessageRow key={message.id} message={message} currentUserId={user?.id} onReact={toggleReaction} onThread={openThread} compact />)}
            </div>
            <Composer value={threadBody} onChange={setThreadBody} onSend={() => sendMessage(threadRoot.id)} dense />
          </>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex h-11 items-center border-b border-[var(--line)] px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Thread</div>
            <div className="grid flex-1 place-items-center px-6 text-center text-xs text-[var(--faint)]">Select a message</div>
          </div>
        )}
      </aside>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" onMouseDown={() => setSearchOpen(false)}>
          <div className="mx-auto mt-20 max-w-2xl overflow-hidden rounded-[6px] border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl shadow-black/40" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-3">
              <Search size={14} className="text-[var(--muted)]" />
              <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search messages" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--faint)]" />
              <button onClick={() => setSearchOpen(false)} className="font-mono text-[10px] uppercase text-[var(--faint)]">esc</button>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-1">
              {searchHits.map((hit) => (
                <button key={hit.id} onClick={() => { setActiveChannelId(hit.channel_id); setSearchOpen(false); }} className="grid w-full grid-cols-[120px_1fr_80px] gap-3 rounded-[4px] px-2 py-2 text-left text-xs hover:bg-[var(--surface-2)]">
                  <span className="truncate text-[var(--muted)]">#{hit.channel_name ?? "dm"}</span>
                  <span className="truncate text-[var(--text)]">{hit.body}</span>
                  <span className="text-right font-mono text-[10px] text-[var(--faint)]">{formatTime(hit.created_at)}</span>
                </button>
              ))}
              {!searchHits.length ? <p className="p-6 text-center text-xs text-[var(--faint)]">Type to search</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionTitle({ icon, label, className }: { icon: React.ReactNode; label: string; className?: string }) {
  return <p className={cn("mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]", className)}>{icon}{label}</p>;
}

function ChannelIcon({ channel }: { channel: Channel | null }) {
  if (channel?.type === "private") return <Lock size={14} className="text-[var(--muted)]" />;
  if (channel?.type === "dm") return <MessageSquare size={14} className="text-[var(--muted)]" />;
  return <Hash size={14} className="text-[var(--muted)]" />;
}

function ChannelButton({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex h-7 w-full items-center gap-1.5 rounded-[5px] px-1.5 text-left text-xs transition-colors", active ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]")}>
      <ChannelIcon channel={channel} />
      <span className="truncate">{channelLabel(channel.name, channel.type)}</span>
    </button>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return <div className={cn("grid shrink-0 place-items-center rounded-[4px] border border-[var(--line)] bg-[var(--surface-2)] font-mono font-medium text-[var(--muted)]", size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]")}>{initials(name)}</div>;
}

function MessageRow({ message, currentUserId, onReact, onThread, compact = false }: { message: ChatMessage; currentUserId?: string; onReact: (message: ChatMessage, emoji: string) => void; onThread: (message: ChatMessage) => void; compact?: boolean }) {
  const author = message.profiles?.display_name ?? message.profiles?.email ?? (message.author_id === currentUserId ? "You" : "Unknown");
  const groupedReactions = new Map<string, number>();
  message.reactions?.forEach((reaction) => groupedReactions.set(reaction.emoji, (groupedReactions.get(reaction.emoji) ?? 0) + 1));

  return (
    <article className={cn("group grid grid-cols-[58px_26px_minmax(0,1fr)] gap-2 px-3 py-1.5 hover:bg-[var(--surface-hover)]", message.pending && "opacity-70", message.failed && "bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]", compact && "grid-cols-[42px_24px_minmax(0,1fr)] px-2")}>
      <time className="pt-1 font-mono text-[10px] text-[var(--faint)]">{formatTime(message.created_at)}</time>
      <Avatar name={author} />
      <div className="min-w-0">
        <div className="flex h-5 items-center gap-2">
          <span className="truncate text-xs font-medium text-[var(--text)]">{author}</span>
          {message.pending ? <span className="font-mono text-[10px] uppercase text-[var(--warn)]">sending</span> : null}
          {message.failed ? <span className="font-mono text-[10px] uppercase text-[var(--danger)]">failed</span> : null}
          <div className="ml-auto hidden items-center gap-1 group-hover:flex">
            {emojiQuick.map((emoji) => <button key={emoji} onClick={() => onReact(message, emoji)} className="h-5 rounded-[4px] border border-[var(--line)] px-1.5 font-mono text-[10px] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]">{displayEmoji(emoji)}</button>)}
            <button onClick={() => onThread(message)} className="h-5 rounded-[4px] border border-[var(--line)] px-1.5 font-mono text-[10px] uppercase text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]">reply</button>
          </div>
        </div>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-[var(--text)]">{message.body}</p>
        {message.attachments?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((attachment) => (
              <span key={attachment.id} className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-[var(--line)] px-1.5 text-[11px] text-[var(--muted)]"><Paperclip size={11} /> {attachment.file_name}</span>
            ))}
          </div>
        ) : null}
        {groupedReactions.size ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...groupedReactions].map(([emoji, count]) => <span key={emoji} className="rounded-[4px] border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">{displayEmoji(emoji)} {count}</span>)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Composer({ value, onChange, onSend, file, onFile, dense = false }: { value: string; onChange: (value: string) => void; onSend: () => void; file?: File | null; onFile?: (file: File | null) => void; dense?: boolean }) {
  return (
    <div className={cn("border-t border-[var(--line)] bg-[var(--surface-0)] p-2", dense && "p-2")}>
      {file ? <div className="mb-1 flex h-7 items-center justify-between rounded-[5px] border border-[var(--line)] px-2 text-[11px] text-[var(--muted)]"><span className="truncate">{file.name}</span><button onClick={() => onFile?.(null)} className="text-[var(--faint)] hover:text-[var(--text)]">Remove</button></div> : null}
      <div className="flex items-end gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-1.5 focus-within:border-[var(--accent)]">
        <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
          <Paperclip size={14} />
          <input className="hidden" type="file" onChange={(event) => onFile?.(event.target.files?.[0] ?? null)} />
        </label>
        <Textarea density="compact" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSend(); }} placeholder="Message" rows={dense ? 2 : 1} className="min-h-7 border-0 bg-transparent px-1 py-1.5 focus:ring-0" />
        <Button onClick={onSend} size="icon" className="h-7 w-7" aria-label="Send"><Send size={13} /></Button>
      </div>
    </div>
  );
}
