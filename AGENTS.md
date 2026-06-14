# AGENTS.md

Guidance for humans and AI agents working in the Flack codebase. Flack is a single-organization, real-time team chat app built on Next.js 16 (App Router, Turbopack, React Compiler) + React 19.2 + Supabase. For product/setup overview see [README.md](./README.md); for visual and UX intent see [.impeccable.md](./.impeccable.md) and [.github/copilot-instructions.md](./.github/copilot-instructions.md).

## Setup

```bash
pnpm install          # install deps (pnpm is required; version pinned via devEngines)
supabase start        # boot local Postgres/Auth/Realtime/Storage (applies migrations + seed)
cp .env.example .env.local   # then fill values printed by `supabase start`
pnpm dev              # start the dev server at http://localhost:3000
```

Requires Node 22+, pnpm 11.5.0, the Supabase CLI, and Docker.

## Commands

| Task            | Command                                              |
| --------------- | ---------------------------------------------------- |
| Dev server      | `pnpm dev`                                           |
| Build           | `pnpm build`                                         |
| Lint            | `pnpm lint`                                          |
| Type-check      | `pnpm typecheck`                                     |
| Format          | `pnpm format` (write) / `pnpm format:check` (verify) |
| Test            | `pnpm test`                                          |
| Test + coverage | `pnpm test:coverage`                                 |
| Dead code/deps  | `pnpm knip`                                          |
| Duplication     | `pnpm duplication` (jscpd)                           |
| Tech debt scan  | `pnpm tech-debt`                                     |
| Validate docs   | `pnpm validate-docs`                                 |
| Bundle analyze  | `pnpm analyze`                                       |
| Reset local DB  | `supabase db reset`                                  |

**Before committing or finishing a task, run:** `pnpm lint && pnpm typecheck && pnpm test`. The Husky `pre-commit` hook enforces `lint-staged` (Prettier check + ESLint with `--max-warnings=0`), `pnpm typecheck`, and `pnpm tech-debt`, so commits fail on any lint warning, format drift, type error, or untracked TODO marker. The `Code Quality` GitHub Actions workflow (`.github/workflows/code-quality.yml`) additionally runs `knip`, `jscpd`, and the tech-debt scan on every push and PR.

## Conventions

- **Language:** TypeScript in strict mode. Do not introduce `any`; prefer precise types. JS files are not allowed (`allowJs: false`).
- **Imports:** Use the `@/*` path alias for everything under `src/` (e.g. `@/lib/supabase/server`). Do not use deep relative paths across feature boundaries.
- **Formatting (Prettier):** 120 char width, semicolons, double quotes, no trailing commas. Never hand-format; run `pnpm format`.
- **Linting:** ESLint flat config extending `next/core-web-vitals` and `next/typescript`. Code must pass with zero warnings.
- **Components:** Use shadcn/ui primitives in `src/components/ui` and the `cn()` helper from `@/lib/utils` for class merging. Match the existing new-york shadcn style; icons come from `lucide-react`.
- **Naming:** Files are kebab-case (`login-form.tsx`, `chat-workspace.tsx`). React components are PascalCase; functions/variables are camelCase; types are PascalCase. These identifier conventions are enforced by the `@typescript-eslint/naming-convention` rule in `eslint.config.mjs`. Object/type property keys may be `snake_case` to mirror the Supabase schema (e.g. `org_id`, `channel_id`); UPPER_CASE is allowed for constants.
- **Comments:** Keep code self-documenting. Add a comment only for a non-obvious constraint or workaround.
- **Complexity:** ESLint enforces `complexity: ["error", 20]` (ESLint's default ceiling) on all `.ts`/`.tsx` files. Keep cyclomatic complexity per function at or below 20; split branchy render trees into focused subcomponents and extract pure helpers rather than growing a single function.
- **File size:** ESLint enforces `max-lines` (600 code lines, blank/comment lines excluded). Split large modules: presentational chat subcomponents live in `src/features/chat/chat-parts.tsx`, the container logic in `chat-workspace.tsx`.
- **Code quality tooling:** `knip` detects unused files, exports, and dependencies; `jscpd` flags copy-paste duplication (fails over 3%); `scripts/scan-tech-debt.mjs` requires every `TODO`/`FIXME`/`HACK`/`XXX` to reference a tracked issue (e.g. `TODO(ABC-123)`, `FIXME #45`, or an issue URL); `@next/bundle-analyzer` (`pnpm analyze`) reports bundle/dependency size (it runs the Webpack builder via `next build --webpack`, since Turbopack is the default build and the analyzer hooks Webpack); `scripts/validate-docs.mjs` (`pnpm validate-docs`) keeps this file and `README.md` honest by failing if a documented `pnpm <script>` command no longer exists in `package.json` or if any relative link points to a missing file. It runs in the Husky pre-commit hook and in CI, so stale commands or dead doc links are caught automatically. When you rename/remove a script or move a file referenced here, update the doc in the same change.

## Architecture

- **Routing:** App Router under `src/app`. Route groups: `(app)` is the authenticated surface (its layout guards on `supabase.auth.getUser()` and redirects to `/login`); `(auth)` holds `login`, `signup`, and `invite/[token]`. `auth/callback/route.ts` exchanges the auth code for a session and accepts invites.
- **Session handling:** `src/proxy.ts` (Next.js 16 proxy, formerly `middleware.ts`) calls `updateSession` to refresh the Supabase session cookie on each request. Keep the `matcher` in sync if route patterns change.
- **Supabase clients (`src/lib/supabase`):** use `createSupabaseServerClient()` in Server Components / route handlers, `createSupabaseBrowserClient()` in Client Components, and the `middleware` helper for session refresh. All env access goes through `getSupabaseEnv()` - do not read `process.env` for Supabase keys directly.
- **Features:** Feature-scoped code lives in `src/features/<feature>`. The main UI is `features/chat/chat-workspace.tsx`. Message list state uses the pure helpers in `features/messages/optimistic.ts` (`mergeIncomingMessage`, `markMessageFailed`, `removeMessage`) - keep these pure and unit-tested.
- **Realtime + optimistic UI:** Messages are sent optimistically (marked `pending`), then reconciled when the realtime broadcast echoes back (deduped by id). Preserve this pattern; do not block the UI on the network round-trip.
- **Types:** UI-facing domain types live in `src/types/chat.ts`; the Supabase schema type is `src/types/database.ts` (`Database`). Supabase clients are typed with `Database`.

## Database

- Schema, RLS policies, functions, and triggers live in `supabase/migrations/`. Never edit an applied migration - add a new sequentially numbered migration file (e.g. `003_*.sql`).
- All tables are protected by **row-level security** and scoped per organization via `current_org_id()`. Any new table must enable RLS and define policies; otherwise data is inaccessible to clients.
- Tables: `organizations`, `profiles`, `channels`, `channel_members`, `messages`, `reactions`, `attachments`, `mentions`, `notifications`, `invites`.
- Server-side logic prefers Postgres functions/RPCs (`create_invite`, `accept_invite`, `search_messages`) over ad-hoc client queries for privileged operations.
- After changing the schema, update `src/types/database.ts` to match, and run `supabase db reset` locally to verify migrations apply cleanly.
- For the full migration + RLS + types workflow, follow the `supabase-migration` skill in [`.factory/skills/supabase-migration/SKILL.md`](./.factory/skills/supabase-migration/SKILL.md).

## Skills

- Reusable, repo-specific agent skills live in `.factory/skills/<name>/SKILL.md` (open SKILL standard: YAML frontmatter with `name` + `description`, then a prompt body). Load the matching skill before related work.
- `supabase-migration` - authoring a new Supabase migration with correct RLS, realtime wiring, and synced TypeScript types.

## Testing

- **Unit tests (Vitest):** jsdom environment with globals enabled. Test files are `*.test.ts` / `*.test.tsx` colocated with source under `src/` (enforced by the `include` glob in `vitest.config.ts`). Favor fast, pure unit tests for logic (see `features/messages/optimistic.test.ts`); keep business logic in pure functions so it is testable without Supabase or the DOM. Run `pnpm test`.
- **Coverage thresholds:** `pnpm test:coverage` enforces coverage on the pure logic layer (`src/lib/utils.ts`, `src/features/messages/optimistic.ts`): 100% statements/functions/lines and 90% branches (see `vitest.config.ts`). When you add logic to those modules or extract new pure helpers, add unit tests so the gate stays green. CI runs `pnpm test:ci`, which also fails on a coverage drop.
- **Test performance + flaky detection:** `pnpm test:ci` writes a JUnit report to `reports/junit.xml` (per-suite timing) and is uploaded as a CI artifact; Vitest flags tests slower than `slowTestThreshold` (300ms). Vitest retries once locally / twice in CI and Playwright retries twice in CI, so a test that only passes on retry is surfaced as flaky in the JUnit/HTML reports rather than silently masked.
- **End-to-end tests (Playwright):** specs live in `e2e/*.spec.ts` and are configured in `playwright.config.ts`. The config builds and starts the Next.js production server (`pnpm build && pnpm start`) with dummy `NEXT_PUBLIC_SUPABASE_*` env vars, so tests run against the shipped artifact and the public auth pages plus the auth-guard redirect can be tested without a running Supabase backend. Run `pnpm test:e2e` (or `pnpm test:e2e:ui` for the inspector). E2E specs are excluded from Vitest, and Vitest unit tests are excluded from Playwright.
- E2E tests that depend on an authenticated session require a running local Supabase stack (`supabase start`) and real credentials; keep those separate from the no-backend smoke tests.
- Run `pnpm test` (and `pnpm test:e2e` when touching routing/UI flows) before finishing.

## Observability

- **Structured logging:** Use the shared `pino` logger in [`src/lib/logger.ts`](./src/lib/logger.ts) for server-side logging (route handlers, server clients, server actions). Import the base `logger` for module-level logs, or `requestLogger(scope, context)` to get a child logger that tags every line with a `scope` and request context. Logs are emitted as structured JSON with an ISO timestamp and a `service: "flack"` base field; level defaults to `debug` in development and `info` in production, overridable via the `LOG_LEVEL` env var.
- **Redaction / log scrubbing:** The logger is configured with `redact` paths that censor sensitive fields (`password`, `token`, `invite_token`, `access_token`/`refresh_token`, `email`, `authorization`, `cookie`) as `[redacted]`. Never log raw auth tokens, session cookies, or full user records; pass objects through the logger so redaction applies. Extend the `redactPaths` array in `logger.ts` when introducing new sensitive fields.
- **Usage:** Prefer structured logging over `console.*` in server code. Log recoverable failures at `warn`, unexpected failures at `error` (include the error as `{ err }`), and notable lifecycle events at `info` (see `src/app/auth/callback/route.ts`). `pino` targets the Node.js runtime; do not import the logger into Edge-runtime middleware.
- **Health check:** `GET /health` ([`src/app/health/route.ts`](./src/app/health/route.ts)) returns a structured readiness report (`{ status, uptimeSeconds, timestamp, checks[] }`) with `Cache-Control: no-store`. It verifies the Supabase env is present and probes `${SUPABASE_URL}/auth/v1/health` with a 2s timeout. Responds `200` when ready and `503` (`status: "degraded"`) when a check fails - use it for load-balancer/uptime probes and deploy smoke checks. The check logic lives in the testable [`src/lib/health.ts`](./src/lib/health.ts) (`checkReadiness`, dependency-injectable for unit tests); extend its `checks` array when you add critical downstream dependencies.
- **Runbooks:** Incident-response playbooks live in [`docs/runbooks/`](./docs/runbooks/). When responding to an incident, start with [`incident-response.md`](./docs/runbooks/incident-response.md) for triage/severity, then follow the symptom-specific runbook: [Supabase degraded](./docs/runbooks/supabase-degraded.md), [auth failures](./docs/runbooks/auth-failures.md), or [deployment rollback](./docs/runbooks/deployment-rollback.md). Keep these updated when an incident reveals a missing or wrong step.

## Guardrails

- Never commit secrets. `.env` / `.env.local` are gitignored; only `.env.example` is tracked. All Supabase keys used client-side must be public (`NEXT_PUBLIC_*` publishable/anon keys), never service-role keys.
- Do not weaken or bypass RLS policies to make a feature work.
- Do not downgrade TypeScript strictness or add ESLint disable comments to silence real issues.
- Keep changes scoped; match the surrounding style and existing patterns.
- **Ownership/review:** [`.github/CODEOWNERS`](./.github/CODEOWNERS) maps paths to reviewers; security-sensitive areas (`src/lib/supabase/`, `src/app/auth/`, `supabase/` migrations, `.github/` automation) require their owner's review. Update CODEOWNERS when adding a new top-level area.

## Issues & pull requests

- **Issue templates:** Use the structured forms in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/) (`bug_report.yml`, `feature_request.yml`). Both capture an affected area (auth/chat/messages/realtime/supabase/observability/tooling) and apply `type:` + `priority:` labels. Blank issues are disabled via `config.yml`.
- **Pull requests:** Follow [`.github/pull_request_template.md`](./.github/pull_request_template.md) — describe the change, link the issue, mark the type and affected area, and record which checks you ran (`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` when UI/routing changes). Call out any `supabase/migrations` or RLS changes explicitly.
