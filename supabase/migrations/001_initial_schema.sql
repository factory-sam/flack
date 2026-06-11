create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.profile_role as enum ('admin', 'member');
create type public.channel_type as enum ('public', 'private', 'dm');
create type public.member_role as enum ('owner', 'member');
create type public.notification_type as enum ('mention', 'thread', 'dm', 'reaction');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email citext,
  display_name text,
  avatar_url text,
  status text,
  role public.profile_role not null default 'member',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade default '00000000-0000-4000-8000-000000000001',
  type public.channel_type not null default 'public',
  name text,
  topic text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint channel_name_required check (type = 'dm' or nullif(name, '') is not null),
  constraint channel_name_unique unique (org_id, type, name)
);

create table public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 8000),
  parent_id uuid references public.messages(id) on delete cascade,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', coalesce(body, ''))) stored
);

create table public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);

create table public.mentions (
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, mentioned_user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  message_id uuid references public.messages(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade default '00000000-0000-4000-8000-000000000001',
  email citext not null,
  role public.profile_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index messages_channel_created_idx on public.messages (channel_id, created_at desc, id desc);
create index messages_parent_idx on public.messages (parent_id, created_at);
create index messages_tsv_idx on public.messages using gin (tsv);
create index channel_members_user_idx on public.channel_members (user_id, channel_id);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.attachments enable row level security;
alter table public.mentions enable row level security;
alter table public.notifications enable row level security;
alter table public.invites enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_channel_member(target_channel_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channel_members cm
    where cm.channel_id = target_channel_id
      and cm.user_id = target_user_id
  )
$$;

create policy "org members can read org" on public.organizations for select to authenticated
using (id = public.current_org_id());

create policy "profiles are visible inside org" on public.profiles for select to authenticated
using (org_id = public.current_org_id());

create policy "users can update their profile" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "channels visible to members" on public.channels for select to authenticated
using (type = 'public' or public.is_channel_member(id));

create policy "admins and members can create channels" on public.channels for insert to authenticated
with check (org_id = public.current_org_id() and created_by = auth.uid());

create policy "owners and admins update channels" on public.channels for update to authenticated
using (public.is_admin() or exists (select 1 from public.channel_members cm where cm.channel_id = id and cm.user_id = auth.uid() and cm.role = 'owner'))
with check (org_id = public.current_org_id());

create policy "memberships visible to channel members" on public.channel_members for select to authenticated
using (public.is_channel_member(channel_id) or exists (select 1 from public.channels c where c.id = channel_id and c.type = 'public'));

create policy "users join public channels or admins add members" on public.channel_members for insert to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.channels c where c.id = channel_id and c.created_by = auth.uid())
);

create policy "users update own read state" on public.channel_members for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "channel members read messages" on public.messages for select to authenticated
using (public.is_channel_member(channel_id));

create policy "channel members insert own messages" on public.messages for insert to authenticated
with check (author_id = auth.uid() and public.is_channel_member(channel_id));

create policy "authors edit own messages" on public.messages for update to authenticated
using (author_id = auth.uid() and public.is_channel_member(channel_id))
with check (author_id = auth.uid() and public.is_channel_member(channel_id));

create policy "authors delete own messages" on public.messages for delete to authenticated
using (author_id = auth.uid() and public.is_channel_member(channel_id));

create policy "members read reactions" on public.reactions for select to authenticated
using (exists (select 1 from public.messages m where m.id = message_id and public.is_channel_member(m.channel_id)));

create policy "members react as themselves" on public.reactions for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id and public.is_channel_member(m.channel_id)));

create policy "users remove own reactions" on public.reactions for delete to authenticated
using (user_id = auth.uid());

create policy "members read attachments" on public.attachments for select to authenticated
using (exists (select 1 from public.messages m where m.id = message_id and public.is_channel_member(m.channel_id)));

create policy "members attach to messages" on public.attachments for insert to authenticated
with check (exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid() and public.is_channel_member(m.channel_id)));

create policy "members read mentions" on public.mentions for select to authenticated
using (mentioned_user_id = auth.uid() or exists (select 1 from public.messages m where m.id = message_id and public.is_channel_member(m.channel_id)));

create policy "authors create mentions" on public.mentions for insert to authenticated
with check (exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid()));

create policy "users read own notifications" on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "system or admins create notifications" on public.notifications for insert to authenticated
with check (public.is_admin() or user_id = auth.uid());

create policy "users update own notifications" on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "admins manage invites" on public.invites for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid := '00000000-0000-4000-8000-000000000001';
  new_role public.profile_role;
begin
  insert into public.organizations (id, name) values (target_org, 'Flack') on conflict (id) do nothing;

  select case when exists (select 1 from public.profiles) then 'member'::public.profile_role else 'admin'::public.profile_role end into new_role;

  insert into public.profiles (id, org_id, email, display_name, role)
  values (new.id, target_org, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), new_role)
  on conflict (id) do nothing;

  insert into public.channel_members (channel_id, user_id, role)
  select id, new.id, case when name = 'general' then 'owner'::public.member_role else 'member'::public.member_role end
  from public.channels
  where org_id = target_org and type = 'public'
  on conflict do nothing;

  update public.invites set accepted_at = now() where lower(email::text) = lower(new.email) and accepted_at is null;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.broadcast_message_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  topic text;
begin
  topic := 'channel:' || coalesce(new.channel_id, old.channel_id)::text;
  perform realtime.broadcast_changes(topic, TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, new, old);
  return coalesce(new, old);
end;
$$;

create trigger messages_broadcast_changes
after insert or update or delete on public.messages
for each row execute function public.broadcast_message_changes();

create or replace function public.broadcast_reaction_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_channel uuid;
begin
  select channel_id into target_channel from public.messages where id = coalesce(new.message_id, old.message_id);
  perform realtime.broadcast_changes('channel:' || target_channel::text, TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, new, old);
  return coalesce(new, old);
end;
$$;

create trigger reactions_broadcast_changes
after insert or update or delete on public.reactions
for each row execute function public.broadcast_reaction_changes();

create or replace function public.create_mention_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, message_id)
  select mentioned_user_id, 'mention', new.message_id
  from public.mentions
  where message_id = new.message_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger mentions_notify
after insert on public.mentions
for each row execute function public.create_mention_notifications();

create or replace function public.search_messages(query_text text, limit_count integer default 20)
returns table (
  id uuid,
  channel_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  channel_name text,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.channel_id, m.body, m.created_at, m.author_id, c.name, p.display_name
  from public.messages m
  join public.channels c on c.id = m.channel_id
  join public.profiles p on p.id = m.author_id
  where public.is_channel_member(m.channel_id)
    and m.deleted_at is null
    and m.tsv @@ websearch_to_tsquery('english', query_text)
  order by ts_rank_cd(m.tsv, websearch_to_tsquery('english', query_text)) desc, m.created_at desc
  limit least(limit_count, 50)
$$;

insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Flack')
on conflict (id) do nothing;

insert into public.channels (id, org_id, type, name, topic)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'public', 'general', 'Company-wide signal'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'public', 'random', 'Low-stakes chatter')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

create policy "members read attachment objects" on storage.objects for select to authenticated
using (
  bucket_id = 'attachments'
  and public.is_channel_member((storage.foldername(name))[1]::uuid)
);

create policy "members upload attachment objects" on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
  and public.is_channel_member((storage.foldername(name))[1]::uuid)
);

create policy "authors update attachment objects" on storage.objects for update to authenticated
using (
  bucket_id = 'attachments'
  and public.is_channel_member((storage.foldername(name))[1]::uuid)
);

alter table realtime.messages enable row level security;

create policy "channel realtime is member gated"
on realtime.messages
for select
to authenticated
using (
  split_part(realtime.topic(), ':', 1) = 'channel'
  and public.is_channel_member(split_part(realtime.topic(), ':', 2)::uuid)
);
