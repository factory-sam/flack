# How to contribute

This section explains how to work in the Flack codebase: the development cycle, testing, debugging, conventions, and the tooling that gates every change. `AGENTS.md` at the repo root is the authoritative quick reference for humans and AI agents; these pages expand on it.

## The short version

1. Install and run the app — see [Getting started](../overview/getting-started.md).
2. Make your change, following [Patterns and conventions](patterns-and-conventions.md).
3. Run the local gate before committing:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
4. The Husky pre-commit hook runs `lint-staged` (Prettier check + ESLint with zero warnings), `pnpm typecheck`, and `pnpm tech-debt`. Commits fail on any lint warning, format drift, type error, or unreferenced TODO marker.
5. On push/PR, the `Code Quality` GitHub Actions workflow re-runs the gate plus `knip`, `jscpd`, and the tech-debt scan, and uploads coverage and JUnit artifacts.

## Definition of done

- Lint, type-check, and unit tests pass locally and in CI.
- New logic in `src/lib/utils.ts` or `src/features/messages/optimistic.ts` keeps coverage at its thresholds (add tests).
- Any schema change ships as a new migration with RLS policies and synced `src/types/database.ts` (see the [supabase-migration skill](tooling.md)).
- No new `any`, no ESLint disable comments to silence real issues, no weakened RLS.

## Ownership

`.github/CODEOWNERS` maps paths to reviewers, with extra scrutiny on auth (`src/app/auth/`, `src/features/auth/`), the Supabase access layer (`src/lib/supabase/`), database migrations (`supabase/`), and CI automation (`.github/`).

## Pages in this section

- [Development workflow](development-workflow.md) — branch, code, verify, commit cycle
- [Testing](testing.md) — Vitest unit suite and Playwright e2e
- [Debugging](debugging.md) — logs, health checks, common failure modes
- [Patterns and conventions](patterns-and-conventions.md) — language, imports, complexity, file size
- [Tooling](tooling.md) — lint, format, dead-code, duplication, tech-debt, bundle analysis, skills
