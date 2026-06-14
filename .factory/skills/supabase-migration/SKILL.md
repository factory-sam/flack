---
name: supabase-migration
description: >-
  Author a new Supabase migration for the Flack schema with correct RLS and
  realtime wiring, then sync the TypeScript types. Use when adding or altering a
  table, column, enum, RLS policy, database function, or trigger under
  supabase/migrations, or when a code change needs a new data model.
---

# Supabase migration workflow

Flack's data layer is Postgres managed entirely through SQL migrations in `supabase/migrations/`. Every table is multi-tenant and protected by row-level security (RLS) scoped to an organization. A schema change is not complete until the migration applies cleanly AND `src/types/database.ts` reflects it.

## When to use this skill

- Adding a new table, column, enum, index, or constraint.
- Adding or changing an RLS policy, `security definer` function, or trigger.
- Any feature that introduces or changes persisted data.

## Hard rules

1. **Never edit an applied migration.** Add a new file with the next zero-padded sequence number, for example `supabase/migrations/003_<short_snake_case_description>.sql`. The existing files are `001_initial_schema.sql` and `002_multi_tenant_organizations.sql`.
2. **Every new table must `enable row level security` and define explicit policies.** Without policies, authenticated clients can read/write nothing through `@supabase/ssr`, and the feature will silently fail.
3. **Keep `src/types/database.ts` in sync.** Clients are typed with `Database`; an out-of-date type is a type-safety hole, not a convenience miss.
4. **SQL style matches the existing files:** lowercase keywords, `public.` schema prefix, `uuid primary key default gen_random_uuid()`, `timestamptz not null default now()` for timestamps, and `on delete cascade`/`set null` foreign keys.

## Step 1 - Write the migration

Create `supabase/migrations/<NNN>_<name>.sql`. Use the established multi-tenant helpers instead of re-deriving org/membership logic:

- `public.current_org_id()` - the caller's `org_id` (security definer, reads `profiles`).
- `public.is_admin()` - true if the caller is an org admin.
- `public.is_channel_member(channel_id [, user_id])` - channel membership check.

Table + RLS template (mirrors the conventions in `001_initial_schema.sql`):

```sql
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (channel_id, message_id)
);

create index pins_channel_idx on public.pins (channel_id, created_at desc);

alter table public.pins enable row level security;

create policy "members read pins" on public.pins for select to authenticated
using (public.is_channel_member(channel_id));

create policy "members create pins" on public.pins for insert to authenticated
with check (
  org_id = public.current_org_id()
  and pinned_by = auth.uid()
  and public.is_channel_member(channel_id)
);

create policy "pinners or admins remove pins" on public.pins for delete to authenticated
using (pinned_by = auth.uid() or public.is_admin());
```

Policy guidance:

- `for select` uses a `using (...)` predicate; writes use `with check (...)`; `update` needs both.
- Scope reads to membership/org; scope writes to `auth.uid()` ownership plus org/membership.
- Reuse the helper functions rather than inlining `select ... from profiles`.

## Step 2 - Realtime (only if the table streams to clients)

Message and reaction changes are pushed to clients via trigger functions that broadcast over Supabase Realtime (see `broadcast_message_changes` / `broadcast_reaction_changes` and their `after insert/update/delete` triggers in `001_initial_schema.sql`). If your new table must update the UI live, add an analogous `security definer` trigger function and trigger, and confirm `[realtime] enabled = true` in `supabase/config.toml`. If clients only read on navigation, skip this.

## Step 3 - Update TypeScript types

Edit `src/types/database.ts` and add the table to `Database["public"]["Tables"]` using the existing `Table<Row>` helper. Add any new enum values to the relevant union types, and add new RPCs under `Functions`. Example:

```ts
pins: Table<{
  id: string;
  org_id: string;
  channel_id: string;
  message_id: string;
  pinned_by: string;
  created_at: string;
}>;
```

If a new domain shape is consumed by the UI, also add/adjust the corresponding type in `src/types/chat.ts`.

## Step 4 - Apply and verify

```bash
supabase db reset      # re-runs every migration + seed against the local stack; fails loudly on bad SQL
pnpm typecheck         # confirms src/types/database.ts changes compile against usage
pnpm test              # run unit tests if you touched related logic
```

`supabase db reset` requires the local Supabase stack (`supabase start`, which needs Docker). If the stack is unavailable, at minimum lint the SQL by eye against `001_initial_schema.sql` conventions and still run `pnpm typecheck`.

## Definition of done

- New `supabase/migrations/<NNN>_*.sql` file added (no existing migration edited).
- RLS enabled and policies defined for any new table.
- `src/types/database.ts` (and `src/types/chat.ts` if needed) updated to match.
- `supabase db reset` applies cleanly and `pnpm typecheck` passes.
