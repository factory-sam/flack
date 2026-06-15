-- Tier 0 Slack-parity: presence/status, unread counts, notification wiring, link previews.

-- Presence + custom status on profiles
create type public.presence_state as enum ('active', 'away', 'dnd');

alter table public.profiles
  add column if not exists status_emoji text,
  add column if not exists status_text text,
  add column if not exists status_expires_at timestamptz,
  add column if not exists presence public.presence_state not null default 'active';

-- Per-channel unread counts for the current user
create or replace function public.channel_unread_counts()
returns table (channel_id uuid, unread integer)
language sql
stable
security definer
set search_path = public
as $$
  select cm.channel_id, count(m.id)::int as unread
  from public.channel_members cm
  left join public.messages m
    on m.channel_id = cm.channel_id
    and m.parent_id is null
    and m.deleted_at is null
    and m.author_id <> cm.user_id
    and (cm.last_read_at is null or m.created_at > cm.last_read_at)
  where cm.user_id = auth.uid()
  group by cm.channel_id
$$;

-- Thread reply notifications: notify the parent author
create or replace function public.create_thread_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is not null then
    select author_id into parent_author from public.messages where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, type, message_id)
      values (parent_author, 'thread', new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger messages_thread_notify
after insert on public.messages
for each row execute function public.create_thread_notifications();

-- DM notifications: notify the other member(s) of a dm channel
create or replace function public.create_dm_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, message_id)
  select cm.user_id, 'dm', new.id
  from public.channel_members cm
  join public.channels c on c.id = cm.channel_id
  where cm.channel_id = new.channel_id
    and c.type = 'dm'
    and cm.user_id <> new.author_id;
  return new;
end;
$$;

create trigger messages_dm_notify
after insert on public.messages
for each row execute function public.create_dm_notifications();

-- Reaction notifications: notify the message author
create or replace function public.create_reaction_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg_author uuid;
begin
  select author_id into msg_author from public.messages where id = new.message_id;
  if msg_author is not null and msg_author <> new.user_id then
    insert into public.notifications (user_id, type, message_id)
    values (msg_author, 'reaction', new.message_id);
  end if;
  return new;
end;
$$;

create trigger reactions_notify
after insert on public.reactions
for each row execute function public.create_reaction_notifications();

-- Broadcast new notifications to the recipient's private realtime topic
create or replace function public.broadcast_notification()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.broadcast_changes(
    'user:' || new.user_id::text,
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, new, null
  );
  return new;
end;
$$;

create trigger notifications_broadcast
after insert on public.notifications
for each row execute function public.broadcast_notification();

-- Allow a user to subscribe to their own private realtime topic
create policy "user realtime is self gated"
on realtime.messages
for select
to authenticated
using (
  split_part(realtime.topic(), ':', 1) = 'user'
  and split_part(realtime.topic(), ':', 2) = auth.uid()::text
);

-- Cached link previews (unfurling)
create table if not exists public.link_previews (
  url text primary key,
  title text,
  description text,
  image_url text,
  site_name text,
  fetched_at timestamptz not null default now()
);

alter table public.link_previews enable row level security;

create policy "authenticated read link previews" on public.link_previews
for select to authenticated using (true);

create policy "authenticated insert link previews" on public.link_previews
for insert to authenticated with check (true);

create policy "authenticated update link previews" on public.link_previews
for update to authenticated using (true) with check (true);
