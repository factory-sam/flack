alter table public.channels alter column org_id drop default;
alter table public.invites alter column org_id drop default;

alter table public.invites drop constraint if exists invites_org_id_email_key;
alter table public.invites add column if not exists token_hash text;
alter table public.invites add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table public.invites add column if not exists accepted_by uuid references public.profiles(id) on delete set null;
alter table public.invites add column if not exists revoked_at timestamptz;

create unique index if not exists invites_active_email_idx
on public.invites (org_id, lower(email::text))
where accepted_at is null and revoked_at is null;

create or replace function public.current_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'::public.profile_role
$$;

drop policy if exists "profiles are visible inside org" on public.profiles;
create policy "profiles are visible inside org" on public.profiles for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and org_id = public.current_org_id() and role = public.current_role());

drop policy if exists "channels visible to members" on public.channels;
create policy "channels visible to members" on public.channels for select to authenticated
using (org_id = public.current_org_id() and (type = 'public' or public.is_channel_member(id)));

drop policy if exists "admins and members can create channels" on public.channels;
create policy "admins and members can create channels" on public.channels for insert to authenticated
with check (org_id = public.current_org_id() and created_by = auth.uid());

drop policy if exists "memberships visible to channel members" on public.channel_members;
create policy "memberships visible to channel members" on public.channel_members for select to authenticated
using (
  public.is_channel_member(channel_id)
  or exists (
    select 1
    from public.channels c
    where c.id = channel_id
      and c.org_id = public.current_org_id()
      and c.type = 'public'
  )
);

drop policy if exists "users join public channels or admins add members" on public.channel_members;
create policy "users join public channels or admins add members" on public.channel_members for insert to authenticated
with check (
  exists (
    select 1
    from public.channels c
    join public.profiles p on p.id = user_id
    where c.id = channel_id
      and c.org_id = public.current_org_id()
      and p.org_id = c.org_id
  )
  and (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.channels c where c.id = channel_id and c.created_by = auth.uid())
  )
);

drop policy if exists "admins manage invites" on public.invites;
create policy "admins manage invites" on public.invites for all to authenticated
using (org_id = public.current_org_id() and public.is_admin())
with check (org_id = public.current_org_id() and public.is_admin());

create or replace function public.add_member_to_public_channels(target_org_id uuid, target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.channel_members (channel_id, user_id, role)
  select id, target_user_id, 'member'::public.member_role
  from public.channels
  where org_id = target_org_id and type = 'public'
  on conflict do nothing
$$;

create or replace function public.create_default_channels(target_org_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  general_id uuid;
  random_id uuid;
begin
  insert into public.channels (org_id, type, name, topic, created_by)
  values (target_org_id, 'public', 'general', 'Company-wide coordination', target_user_id)
  on conflict (org_id, type, name) do update set topic = excluded.topic
  returning id into general_id;

  insert into public.channels (org_id, type, name, topic, created_by)
  values (target_org_id, 'public', 'random', 'Low-stakes conversation', target_user_id)
  on conflict (org_id, type, name) do update set topic = excluded.topic
  returning id into random_id;

  insert into public.channel_members (channel_id, user_id, role)
  values (general_id, target_user_id, 'owner'), (random_id, target_user_id, 'member')
  on conflict do nothing;
end;
$$;

create or replace function public.create_invite(invite_email citext, invite_role public.profile_role default 'member')
returns table (id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_org uuid;
  raw_token text;
  invite_id uuid;
  invite_expires_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only organization admins can invite members';
  end if;

  target_org := public.current_org_id();
  if target_org is null then
    raise exception 'No organization context';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.invites (org_id, email, role, invited_by, token_hash, expires_at)
  values (target_org, lower(invite_email::text), invite_role, auth.uid(), encode(digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days')
  on conflict (org_id, (lower(email::text))) where accepted_at is null and revoked_at is null
  do update set
    role = excluded.role,
    invited_by = excluded.invited_by,
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    created_at = now()
  returning invites.id, invites.expires_at into invite_id, invite_expires_at;

  return query select invite_id, raw_token, invite_expires_at;
end;
$$;

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  invite_row public.invites%rowtype;
  user_email text;
  existing_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invite_row
  from public.invites
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invite_row.id is null then
    raise exception 'Invite is invalid or expired';
  end if;

  if lower(invite_row.email::text) <> user_email then
    raise exception 'Invite email does not match signed-in user';
  end if;

  select org_id into existing_org from public.profiles where id = auth.uid();
  if existing_org is not null and existing_org <> invite_row.org_id then
    raise exception 'User already belongs to a different organization';
  end if;

  insert into public.profiles (id, org_id, email, display_name, role)
  values (auth.uid(), invite_row.org_id, user_email, split_part(user_email, '@', 1), invite_row.role)
  on conflict (id) do update set
    org_id = excluded.org_id,
    email = excluded.email,
    role = excluded.role;

  perform public.add_member_to_public_channels(invite_row.org_id, auth.uid());

  update public.invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite_row.id;

  return invite_row.org_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  org_name text;
  target_org uuid;
  invite_token text;
  invite_row public.invites%rowtype;
  user_email text;
begin
  user_email := lower(new.email);
  invite_token := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');

  if invite_token is not null then
    select *
    into invite_row
    from public.invites
    where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
      and accepted_at is null
      and revoked_at is null
      and expires_at > now()
      and lower(email::text) = user_email
    for update;

    if invite_row.id is null then
      raise exception 'Invite is invalid or expired';
    end if;

    insert into public.profiles (id, org_id, email, display_name, role)
    values (new.id, invite_row.org_id, user_email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(user_email, '@', 1)), invite_row.role)
    on conflict (id) do nothing;

    perform public.add_member_to_public_channels(invite_row.org_id, new.id);

    update public.invites
    set accepted_at = now(), accepted_by = new.id
    where id = invite_row.id;

    return new;
  end if;

  if org_name is not null then
    insert into public.organizations (name)
    values (org_name)
    returning id into target_org;

    insert into public.profiles (id, org_id, email, display_name, role)
    values (new.id, target_org, user_email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(user_email, '@', 1)), 'admin')
    on conflict (id) do nothing;

    perform public.create_default_channels(target_org, new.id);
  end if;

  return new;
end;
$$;

delete from public.organizations o
where o.id = '00000000-0000-4000-8000-000000000001'
  and not exists (select 1 from public.profiles p where p.org_id = o.id);
