# Tooling

The build, quality, and automation tooling that supports development in Flack. All of it runs locally and in CI.

## Package scripts

From `package.json`:

| Command                                             | Purpose                                     |
| --------------------------------------------------- | ------------------------------------------- |
| `pnpm dev`                                          | Next.js dev server                          |
| `pnpm build` / `pnpm start`                         | production build / run                      |
| `pnpm lint`                                         | ESLint (`eslint .`)                         |
| `pnpm typecheck`                                    | `tsc --noEmit`                              |
| `pnpm format` / `pnpm format:check`                 | Prettier write / check                      |
| `pnpm test` / `pnpm test:coverage` / `pnpm test:ci` | Vitest variants                             |
| `pnpm test:e2e` / `pnpm test:e2e:ui`                | Playwright                                  |
| `pnpm knip`                                         | dead code + unused dependency detection     |
| `pnpm duplication`                                  | jscpd copy-paste detection                  |
| `pnpm tech-debt`                                    | TODO/FIXME issue-reference scan             |
| `pnpm analyze`                                      | bundle analysis (`ANALYZE=true next build`) |

## Quality tools

- **ESLint** (`eslint.config.mjs`) — flat config; complexity (20), max-lines (600), and naming-convention rules on top of `next/core-web-vitals` and `next/typescript`.
- **Prettier** — formatting; enforced via `lint-staged` in the pre-commit hook.
- **knip** (`knip.json`) — flags unused files, exports, and dependencies. Entry points are `scripts/*.mjs` and `e2e/**/*.spec.ts`; `eslint-config-next` and `tailwindcss` are ignored as known-used.
- **jscpd** (`.jscpd.json`) — fails when duplication exceeds 3% (min 8 lines / 60 tokens), scanning `src` and ignoring tests and `.d.ts` files.
- **scan-tech-debt** (`scripts/scan-tech-debt.mjs`) — walks `src` and `e2e`, matches `TODO|FIXME|HACK|XXX`, and exits non-zero if any marker lacks an issue reference (`(ABC-123)`, `#45`, or a URL).
- **@next/bundle-analyzer** (`next.config.ts`) — wraps the Next config; `pnpm analyze` opens a treemap of the bundle.

## Build configuration

- `next.config.ts` — minimal; `typedRoutes: false`, wrapped with the bundle analyzer (enabled only when `ANALYZE=true`).
- `tsconfig.json` — strict TypeScript with the `@/*` path alias.
- `postcss.config.mjs` + Tailwind v4 — styling; tokens defined in `src/app/globals.css`.
- `components.json` — shadcn/ui config (new-york style, RSC, lucide icons).

## CI

`.github/workflows/code-quality.yml` runs lint, typecheck, `test:ci`, knip, jscpd, and tech-debt on push to `main` and on PRs, then uploads the JUnit report and coverage as artifacts. See [Development workflow](development-workflow.md) for the full pipeline diagram.

## Skills

Reusable, repo-specific agent skills live under `.factory/skills/<name>/SKILL.md`. The one shipped skill is **`supabase-migration`** (`.factory/skills/supabase-migration/SKILL.md`): it codifies the migration workflow — write a new zero-padded migration, enable RLS with explicit policies, wire realtime triggers if the table streams to clients, sync `src/types/database.ts`, then verify with `supabase db reset` and `pnpm typecheck`. Load it before any schema change. The data model it operates on is documented in [Data models](../reference/data-models.md).

## CODEOWNERS

`.github/CODEOWNERS` maps paths to reviewers, with explicit owners for the auth flow, Supabase access layer, migrations, observability, and CI configuration.
