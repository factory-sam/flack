# Lore

A short history of how the Flack codebase came to be. With a single commit in git history so far, most of the story is recent and visible in the working tree rather than in the log.

## Eras

### Genesis (Jun 2026)

The repository starts with one commit, `e77b794` "Initial Flack app" (2026-06-11, Sam Fitzgerald). This commit established the whole product surface at once:

- Next.js 15 App Router scaffold with `(app)` and `(auth)` route groups.
- The full Supabase data layer in two migrations — `001_initial_schema.sql` (tables, RLS, realtime broadcast triggers, full-text search) and `002_multi_tenant_organizations.sql` (per-org tenancy, hashed invite tokens, org-creation onboarding).
- The chat UI, auth forms, and optimistic message helpers.

### Hardening for agents (Jun 2026, uncommitted)

After the initial commit, a wave of tooling and reliability work landed in the working tree (not yet committed):

- **Observability** — a `pino` structured logger with redaction (`src/lib/logger.ts`) wired into the auth callback and server client, and a `/health` readiness endpoint (`src/app/health/route.ts`, `src/lib/health.ts`).
- **Quality gates** — ESLint rules for complexity (20), file size (600 lines), and naming; `knip`, `jscpd`, and a `scan-tech-debt.mjs` script; a `code-quality.yml` GitHub Actions workflow.
- **Testing** — Vitest coverage thresholds, retries, and JUnit timing reports; Playwright e2e smoke tests that run without a backend.
- **Repo hygiene** — `.github/CODEOWNERS`, a `supabase-migration` skill, and the `AGENTS.md` guide.

This phase is about making the codebase safe for autonomous agents to work in: deterministic checks, structured logs, and explicit conventions.

## Longest-standing code

Everything dates to the same genesis commit, so longevity is uniform. The most central and refactor-resistant pieces are the SQL migrations: `001_initial_schema.sql` defines the data contract (tables, RLS, triggers) that the rest of the app is built around, and the rule "never edit an applied migration" (see the [supabase-migration skill](how-to-contribute/tooling.md)) means it is effectively append-only.

## Notable evolution

- The chat UI was split: `chat-workspace.tsx` (container/state) and `chat-parts.tsx` (presentational) to satisfy the 600-line file ceiling.
- The README still lists TanStack Query and Zod in the tech stack, but those dependencies were removed as unused; the current dependency set is documented in [Dependencies](reference/dependencies.md). This is the clearest example of docs lagging behind a dependency cleanup.

## Deprecated / removed

No features have been deprecated yet. The only removals so far are unused dependencies (`cmdk`, `zod`, `@tanstack/react-query`, `@testing-library/react`) pruned during the hardening phase.
