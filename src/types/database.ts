export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<{
        id: string;
        name: string;
        created_at: string;
      }>;
      profiles: Table<{
        id: string;
        org_id: string;
        email: string | null;
        display_name: string | null;
        avatar_url: string | null;
        status: string | null;
        status_emoji: string | null;
        status_text: string | null;
        status_expires_at: string | null;
        presence: "active" | "away" | "dnd";
        role: "admin" | "member";
        last_seen_at: string | null;
        created_at: string;
      }>;
      channels: Table<{
        id: string;
        org_id: string;
        type: "public" | "private" | "dm";
        name: string | null;
        topic: string | null;
        created_by: string | null;
        created_at: string;
      }>;
      channel_members: Table<{
        channel_id: string;
        user_id: string;
        role: "owner" | "member";
        last_read_at: string | null;
        created_at: string;
      }>;
      messages: Table<{
        id: string;
        channel_id: string;
        author_id: string;
        body: string;
        parent_id: string | null;
        edited_at: string | null;
        deleted_at: string | null;
        created_at: string;
      }>;
      reactions: Table<{
        message_id: string;
        user_id: string;
        emoji: string;
        created_at: string;
      }>;
      attachments: Table<{
        id: string;
        message_id: string;
        storage_path: string;
        file_name: string;
        mime: string | null;
        size: number | null;
        created_at: string;
      }>;
      mentions: Table<{
        message_id: string;
        mentioned_user_id: string;
        created_at: string;
      }>;
      notifications: Table<{
        id: string;
        user_id: string;
        type: "mention" | "thread" | "dm" | "reaction";
        message_id: string | null;
        read_at: string | null;
        created_at: string;
      }>;
      invites: Table<{
        id: string;
        org_id: string;
        email: string;
        role: "admin" | "member";
        invited_by: string | null;
        token_hash: string | null;
        expires_at: string;
        accepted_by: string | null;
        accepted_at: string | null;
        revoked_at: string | null;
        created_at: string;
      }>;
      link_previews: Table<{
        url: string;
        title: string | null;
        description: string | null;
        image_url: string | null;
        site_name: string | null;
        fetched_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      accept_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
      channel_unread_counts: {
        Args: Record<string, never>;
        Returns: Array<{ channel_id: string; unread: number }>;
      };
      create_invite: {
        Args: { invite_email: string; invite_role?: "admin" | "member" };
        Returns: Array<{ id: string; token: string; expires_at: string }>;
      };
      search_messages: {
        Args: { query_text: string; limit_count?: number };
        Returns: Array<{
          id: string;
          channel_id: string;
          body: string;
          created_at: string;
          author_id: string;
          channel_name: string | null;
          display_name: string | null;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
