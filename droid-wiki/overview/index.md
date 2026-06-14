# Flack

Flack is low-latency team chat for a single organization. It is a real-time messaging app with public and private channels, direct messages, threaded replies, mentions, reactions, file attachments, and full-text search, aimed at power users who live in chat all day.

## What it is

The product is a Slack-style workspace scoped to one tenant per deployment, but the data layer is multi-tenant: every row is tied to an `org_id` and isolated by Postgres row-level security (RLS). A new organization is created at signup, the first user becomes admin, and teammates join through email invites.

The application is a Next.js 15 App Router project (React 19, TypeScript in strict mode) backed by Supabase for Postgres, Auth, Realtime, and Storage. There is no separate backend service: the browser and server components talk to Supabase directly through `@supabase/ssr`, and all server-side business logic lives in SQL (RLS policies, `security definer` functions, and triggers) under `supabase/migrations/`.

## Core capabilities

- **Channels and DMs** — `channels.type` is `public`, `private`, or `dm`. See [Messaging](../features/messaging.md).
- **Threads** — replies hang off a parent message via `messages.parent_id`.
- **Optimistic sending** — messages render immediately as `pending`, then reconcile when the realtime broadcast echoes back. See [Realtime and optimistic UI](../features/realtime-and-optimistic.md).
- **Reactions, mentions, attachments** — reactions and mentions are their own tables; attachments live in a private Supabase Storage bucket.
- **Full-text search** — the `search_messages` Postgres function ranks results with `tsvector`/`websearch_to_tsquery`. See [Search](../features/search.md).
- **Auth and onboarding** — email/password and magic-link sign-in, invite acceptance, and session refresh in middleware. See [Authentication](../features/authentication.md).

## How the codebase is organized

| Area            | Path                                     | What lives here                                      |
| --------------- | ---------------------------------------- | ---------------------------------------------------- |
| Routing + pages | `src/app/`                               | App Router route groups, route handlers, root layout |
| UI features     | `src/features/`                          | `auth/`, `chat/`, `messages/`                        |
| Supabase access | `src/lib/supabase/`                      | browser/server/middleware clients and env helper     |
| Observability   | `src/lib/logger.ts`, `src/lib/health.ts` | structured logging and the health endpoint           |
| Domain types    | `src/types/`                             | `chat.ts` (UI) and `database.ts` (schema)            |
| Data layer      | `supabase/`                              | migrations, config, seed                             |

## Where to go next

- New to the project? Start with [Getting started](getting-started.md), then [Architecture](architecture.md).
- Want the data model and trust boundaries? See [Data models](../reference/data-models.md) and [Security](../security.md).
- Contributing? Read [How to contribute](../how-to-contribute/index.md) and [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md).
- Unfamiliar terms? The [Glossary](glossary.md) covers project-specific vocabulary.
