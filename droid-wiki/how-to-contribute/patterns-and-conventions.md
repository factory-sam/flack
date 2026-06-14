# Patterns and conventions

The coding conventions and recurring patterns in Flack. These are enforced by ESLint and Prettier where possible; the rest is consistency the codebase relies on.

## Language and types

- **TypeScript strict.** No `any`; prefer precise types. JS files are not allowed (`allowJs: false`).
- **Domain types are explicit.** UI-facing shapes live in `src/types/chat.ts`; the Supabase schema type is `src/types/database.ts` (`Database`). Supabase clients are typed with `Database`, so query results are typed end to end.
- Object/type property keys may be `snake_case` to mirror the Postgres schema (`org_id`, `channel_id`); the ESLint naming rule allows this for properties.

## Imports

- Use the `@/*` path alias for everything under `src/` (for example `@/lib/supabase/server`). Avoid deep relative paths across feature boundaries.
- Supabase env access goes through `getSupabaseEnv()` — never read `process.env` for Supabase keys directly. See [Supabase access layer](../systems/supabase-access-layer.md).

## Formatting and linting

- **Prettier:** 120-char width, semicolons, double quotes, no trailing commas. Never hand-format; run `pnpm format`.
- **ESLint flat config** (`eslint.config.mjs`) extends `next/core-web-vitals` and `next/typescript`, and must pass with zero warnings. Key custom rules:
  - `complexity: ["error", 20]` — keep cyclomatic complexity per function at or below 20. Split branchy render trees into subcomponents and extract pure helpers.
  - `max-lines: 600` (blank/comment lines excluded) — split large modules.
  - `@typescript-eslint/naming-convention` — camelCase identifiers, PascalCase components/types, UPPER_CASE constants, snake_case allowed for properties.

## Component structure

The chat UI demonstrates the container/presentational split used to stay under the complexity and file-size ceilings:

- `src/features/chat/chat-workspace.tsx` — the container. Holds state, the realtime subscription, and write logic.
- `src/features/chat/chat-parts.tsx` — presentational components (`SectionTitle`, `ChannelButton`, `Avatar`, `MessageRow`, `Composer`, `SearchOverlay`, and more) plus small helpers like `displayEmoji`.

UI primitives come from shadcn/ui in `src/components/ui` (new-york style), and class names are merged with the `cn()` helper in `src/lib/utils.ts`. Icons come from `lucide-react`.

## Pure logic, testable in isolation

Keep business logic in pure functions so it can be unit-tested without Supabase or the DOM. The canonical example is `src/features/messages/optimistic.ts` (`mergeIncomingMessage`, `markMessageFailed`, `removeMessage`), which transforms message arrays and is covered to 100%. The readiness logic in `src/lib/health.ts` follows the same idea with dependency injection for `fetch`.

## Server vs client code

- Client components are marked `"use client"` and use `createSupabaseBrowserClient()`.
- Server components and route handlers use `createSupabaseServerClient()`.
- `pino` logging is server-only; do not import the logger into Edge-runtime middleware. See [Observability](../systems/observability.md).

## Database conventions

Lowercase SQL keywords, `public.` schema prefix, `uuid primary key default gen_random_uuid()`, `timestamptz not null default now()`, `on delete cascade`/`set null` foreign keys. Every table enables RLS and defines policies written against `current_org_id()`, `is_admin()`, and `is_channel_member()`. Reuse those helpers instead of re-deriving org/membership logic. See [Data models](../reference/data-models.md).

## Guardrails

- Never commit secrets; `.env`/`.env.local` are gitignored and only `.env.example` is tracked. Client-side Supabase keys must be public publishable/anon keys, never service-role.
- Do not weaken or bypass RLS to make a feature work.
- Do not downgrade TypeScript strictness or add ESLint disable comments to silence real issues.
