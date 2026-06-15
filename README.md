# Flack

Low-latency team chat for a single organization. Flack is a real-time messaging app with channels, direct messages, threads, mentions, reactions, file attachments, and full-text search, built for power users who live in chat all day.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, React Server Components, Turbopack, React Compiler) + React 19.2
- **Language:** TypeScript (strict mode)
- **Backend / data:** [Supabase](https://supabase.com) (Postgres, Auth, Realtime, Storage) via `@supabase/ssr`
- **Data fetching:** TanStack Query
- **Styling:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (new-york style) + lucide icons
- **Validation:** Zod
- **Tooling:** pnpm, ESLint, Prettier, Husky + lint-staged, Vitest

## Features

- Public and private channels, plus direct messages (`channels.type`: `public` | `private` | `dm`)
- Threaded replies (`messages.parent_id`)
- Message editing and soft-delete with realtime reconciliation
- Optimistic message sending with realtime broadcast reconciliation
- Rich text rendering (sanitized GitHub-flavored markdown)
- Full emoji reactions via picker with recent-emoji history
- Mentions with notifications, reactions, and file attachments (Supabase Storage)
- Unread tracking: per-channel badges (`channel_unread_counts` RPC), new-messages divider, mark-on-read
- Notification center with a live bell over the `user:<id>` private realtime topic
- Custom status (emoji/text/expiry) and presence (active/away/do-not-disturb); do-not-disturb suppresses activity toasts
- SSRF-safe link unfurling (`/api/unfurl`) with `link_previews` caching
- Full-text message search via the `search_messages` Postgres function
- Multi-tenant organizations with row-level security (RLS) isolating data per org
- Invite-based onboarding (`create_invite` / `accept_invite` RPCs)
- Email/password and magic-link auth with session refresh in middleware

## Prerequisites

- **Node.js** 22+
- **pnpm** 11.5.0 (the repo pins this via `devEngines`; if you use Corepack, run `corepack enable`)
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/cli)) for local development
- **Docker** (required by the Supabase CLI to run local Postgres/Auth/Storage)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the local Supabase stack

This boots Postgres, Auth, Realtime, Storage, and Studio locally via Docker.

```bash
supabase start
```

`supabase start` applies the migrations in `supabase/migrations/` and the seed in `supabase/seed.sql`. When it finishes it prints local URLs and keys:

- API URL: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Inbucket (catches auth/invite emails): `http://127.0.0.1:54324`

To reset the database and re-run all migrations and seed at any time:

```bash
supabase db reset
```

### 3. Configure environment variables

Copy the template and fill in the values printed by `supabase start`:

```bash
cp .env.example .env.local
```

| Variable                               | Description                                                    |
| -------------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API URL (local default: `http://127.0.0.1:54321`)     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable / anon key from `supabase start`          |
| `NEXT_PUBLIC_SITE_URL`                 | App base URL used for auth redirects (`http://localhost:3000`) |

> `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback for the publishable key.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/signup` to create the first account, or `/login` to sign in. Invite-based signups land on `/invite/[token]`.

## Available Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Start the Next.js dev server     |
| `pnpm build`        | Production build                 |
| `pnpm start`        | Run the production build         |
| `pnpm lint`         | Run ESLint                       |
| `pnpm typecheck`    | Type-check with `tsc --noEmit`   |
| `pnpm format`       | Format the project with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm test`         | Run the Vitest unit suite        |
| `pnpm test:e2e`     | Run the Playwright e2e suite     |

A Husky `pre-commit` hook runs `lint-staged` (Prettier check + ESLint with zero warnings) and `pnpm typecheck`.

## Project Structure

```
src/
  app/                      # Next.js App Router
    (app)/                  # Authenticated app (auth-guarded layout) -> chat workspace
    (auth)/                 # login, signup, invite/[token]
    auth/callback/route.ts  # OAuth/magic-link code exchange + invite acceptance
    layout.tsx              # Root layout and metadata
    globals.css             # Tailwind + theme tokens
  components/ui/            # shadcn/ui primitives (button, input, ...)
  features/                 # Feature modules
    auth/                   # login-form, signup-form
    chat/                   # chat-workspace (main UI)
    messages/               # optimistic message helpers (+ tests)
  lib/
    supabase/               # client, server, middleware, env helpers
    utils.ts                # cn() and shared helpers
  types/
    chat.ts                 # UI-facing domain types
    database.ts             # Supabase schema types
  proxy.ts                  # Refreshes the Supabase session on each request
supabase/
  config.toml               # Local Supabase stack configuration
  migrations/               # SQL schema, RLS policies, functions, triggers
  seed.sql                  # Seed data
e2e/                        # Playwright end-to-end tests
playwright.config.ts        # Playwright configuration
```

## Data Model

Schema lives in `supabase/migrations/`. Core tables (all with RLS, scoped per organization):

`organizations`, `profiles`, `channels`, `channel_members`, `messages`, `reactions`, `attachments`, `mentions`, `notifications`, `invites`, `link_previews`.

Key database functions: `current_org_id()`, `is_admin()`, `is_channel_member()`, `create_invite()`, `accept_invite()`, `search_messages()`, `channel_unread_counts()`. Triggers broadcast message/reaction changes over Supabase Realtime, create mention/thread/dm/reaction notifications, and broadcast new notifications to each recipient's `user:<id>` private topic. A `handle_new_user` trigger provisions a profile when an auth user is created.

## Testing

**Unit tests** run with Vitest (jsdom environment) and live next to the code they cover (`*.test.ts` / `*.test.tsx` under `src/`):

```bash
pnpm test
```

**End-to-end tests** run with [Playwright](https://playwright.dev). Specs live in `e2e/` and cover routing, the auth-guard redirect, and the login/signup pages. The Playwright config boots the dev server with dummy Supabase env vars, so these smoke tests run without a Supabase backend:

```bash
pnpm exec playwright install chromium   # first time only
pnpm test:e2e                           # run e2e tests
pnpm test:e2e:ui                        # run with the Playwright inspector
```

## Deployment

The frontend deploys to **Vercel** and the backend runs on **Supabase Cloud**.

### Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com).
2. Link the project and push migrations:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

### Vercel

1. Import the repository into Vercel (it auto-detects Next.js).
2. Set the following environment variables (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` -> your Supabase Cloud API URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> your Supabase publishable key
   - `NEXT_PUBLIC_SITE_URL` -> your deployed URL (e.g. `https://flack.example.com`)
3. In Supabase Auth settings, add your Vercel URL and `<site-url>/auth/callback` to the allowed redirect URLs.
4. Deploy. Vercel builds with `pnpm build`.

## Operations & Runbooks

Incident-response runbooks live in [`docs/runbooks/`](./docs/runbooks/). Start with
[incident-response.md](./docs/runbooks/incident-response.md) for triage, then use the symptom-specific
playbooks:

- [Supabase degraded / database errors](./docs/runbooks/supabase-degraded.md)
- [Authentication failures](./docs/runbooks/auth-failures.md)
- [Deployment rollback](./docs/runbooks/deployment-rollback.md)

Health is exposed at `GET /health`; structured logs use the `pino` logger in `src/lib/logger.ts`.

## Contributing

See [AGENTS.md](./AGENTS.md) for development workflow, conventions, and guidance for both humans and AI agents working in this repo. Design intent and aesthetic direction are documented in [.impeccable.md](./.impeccable.md).
