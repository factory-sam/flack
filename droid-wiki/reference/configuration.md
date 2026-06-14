# Configuration

Environment variables and the configuration files that control Flack's build, test, and local-development behavior.

## Environment variables

Tracked template: `.env.example`. Copy to `.env.local` for development. Only public `NEXT_PUBLIC_*` values are used client-side.

| Variable                               | Required | Description                                                |
| -------------------------------------- | -------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | Supabase API URL (local: `http://127.0.0.1:54321`)         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | Publishable / anon key from `supabase start`               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | fallback | Accepted if the publishable key is unset                   |
| `NEXT_PUBLIC_SITE_URL`                 | yes      | App base URL for auth redirects                            |
| `LOG_LEVEL`                            | no       | pino level; defaults to `debug` (dev) / `info` (prod)      |
| `ANALYZE`                              | no       | `true` enables the bundle analyzer during `next build`     |
| `CI`                                   | no       | Set by CI; increases test retries and selects CI reporters |

Env resolution for Supabase goes through `getSupabaseEnv()` in `src/lib/supabase/env.ts`; never read `process.env` for Supabase keys directly. See [Supabase access layer](../systems/supabase-access-layer.md).

## Configuration files

| File                   | Controls                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `next.config.ts`       | Next.js config; `typedRoutes: false`, wrapped with `@next/bundle-analyzer` |
| `tsconfig.json`        | TypeScript strict mode, `@/*` path alias                                   |
| `eslint.config.mjs`    | Flat ESLint config; complexity/max-lines/naming rules                      |
| `vitest.config.ts`     | jsdom, coverage thresholds, retries, slow-test threshold                   |
| `playwright.config.ts` | e2e server on port 3100 with dummy Supabase env, retries in CI             |
| `knip.json`            | dead-code/unused-dependency entry points and project globs                 |
| `.jscpd.json`          | duplication threshold (3%), scan path (`src`)                              |
| `postcss.config.mjs`   | Tailwind v4 / PostCSS pipeline                                             |
| `components.json`      | shadcn/ui config (new-york style, RSC, lucide)                             |
| `supabase/config.toml` | local Supabase stack ports and feature toggles                             |
| `package.json`         | scripts, dependencies, `lint-staged`, `devEngines` (pnpm 11.5.0)           |

## Local Supabase stack (`supabase/config.toml`)

| Service  | Port  | Notes                                                                                                       |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| API      | 54321 | schemas `public`, `storage`, `graphql_public`                                                               |
| Postgres | 54322 | major version 17                                                                                            |
| Studio   | 54323 | table browser / SQL editor                                                                                  |
| Inbucket | 54324 | catches auth/invite emails                                                                                  |
| Storage  | —     | 50 MiB file size limit                                                                                      |
| Auth     | —     | `site_url` `http://localhost:3000`, callback redirect allowed, signups enabled, anonymous sign-ins disabled |

Realtime and the edge runtime are enabled. These local defaults mirror what must be configured in Supabase Cloud for deployment (see [Deployment](../deployment.md)).
