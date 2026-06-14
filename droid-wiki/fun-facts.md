# Fun facts

A few small, genuine curiosities from the Flack codebase.

## The whole app is one commit old

The entire product — schema, RLS, realtime, chat UI, auth — arrived in a single commit, `e77b794` "Initial Flack app" (2026-06-11). Everything else is still sitting in the working tree as uncommitted hardening work.

## The longest file is the chat container

`src/features/chat/chat-workspace.tsx` is the biggest source file at 657 lines, even after the presentational parts were extracted into `chat-parts.tsx` (464 lines). It holds all the chat state, the realtime subscription, and the optimistic send logic. The ESLint `max-lines` ceiling is 600 for `.ts`/`.tsx`, and this file is the reason the split happened in the first place.

## Zero TODOs, by policy

`scan-tech-debt.mjs` reports 0 technical-debt markers. That is not just luck: the script fails the build if any `TODO`/`FIXME`/`HACK`/`XXX` lacks an issue reference like `TODO(ABC-123)`, `FIXME #45`, or a URL. The cheapest way to keep the count clean is to not leave dangling markers.

## Emoji shortcodes, not unicode

Reactions are stored as short tokens, not emoji characters. `displayEmoji` in `src/features/chat/chat-parts.tsx` maps `"+1" → 👍`, `"eyes" → 👀`, and `"check" → ✓`. The database just sees `+1`.

## The org id is a hard-coded UUID

The single-tenant default organization uses the literal UUID `00000000-0000-4000-8000-000000000001` throughout `001_initial_schema.sql`. The multi-tenant migration (`002`) later drops the per-table default so new organizations get real generated ids.

## The realtime channel can't be eavesdropped

Even Supabase Realtime is behind RLS: `realtime.messages` has a policy that parses the topic string (`channel:<uuid>`) and checks `is_channel_member` before letting a client subscribe. You can't listen to a channel you aren't in. See [Security](security.md).
