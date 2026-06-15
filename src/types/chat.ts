export type ChannelType = "public" | "private" | "dm";

export type PresenceState = "active" | "away" | "dnd";

export type Profile = {
  id: string;
  org_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  status_emoji: string | null;
  status_text: string | null;
  status_expires_at: string | null;
  presence: PresenceState;
  role: "admin" | "member";
  last_seen_at: string | null;
};

export type Channel = {
  id: string;
  org_id: string;
  type: ChannelType;
  name: string | null;
  topic: string | null;
  created_at: string;
  channel_members?: Array<{ user_id: string; role: "owner" | "member"; last_read_at: string | null }>;
};

export type Reaction = {
  message_id: string;
  user_id: string;
  emoji: string;
};

export type Attachment = {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime: string | null;
  size: number | null;
  url?: string;
};

export type ChatMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
  profiles?: Pick<Profile, "display_name" | "avatar_url" | "email"> | null;
  reactions?: Reaction[];
  attachments?: Attachment[];
};

export type SearchHit = {
  id: string;
  channel_id: string;
  body: string;
  created_at: string;
  author_id: string;
  channel_name: string | null;
  display_name: string | null;
};
