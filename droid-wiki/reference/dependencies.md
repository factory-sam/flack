# Dependencies

The packages Flack depends on, from `package.json`. The set is intentionally lean; `knip` flags anything unused, and four dependencies the README still mentions (TanStack Query, Zod, cmdk, `@testing-library/react`) were removed as unused.

## Runtime dependencies

| Package                    | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `next` (15)                | App Router framework                                                                 |
| `react` / `react-dom` (19) | UI runtime                                                                           |
| `@supabase/ssr`            | Cookie-based Supabase sessions across server/client                                  |
| `@supabase/supabase-js`    | Supabase client (DB, auth, realtime, storage)                                        |
| `pino`                     | Structured logging with redaction (see [Observability](../systems/observability.md)) |
| `@radix-ui/react-slot`     | Primitive used by shadcn/ui components                                               |
| `class-variance-authority` | Variant styling for UI primitives                                                    |
| `clsx` + `tailwind-merge`  | `cn()` class merging in `src/lib/utils.ts`                                           |
| `lucide-react`             | Icon set                                                                             |
| `@tailwindcss/postcss`     | Tailwind v4 PostCSS integration                                                      |

## Dev dependencies

| Package                                              | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `typescript`                                         | Type checking (strict)                    |
| `eslint` + `eslint-config-next` + `@eslint/eslintrc` | Linting (flat config)                     |
| `prettier`                                           | Formatting                                |
| `husky` + `lint-staged`                              | Pre-commit gate                           |
| `vitest` + `@vitest/coverage-v8` + `jsdom`           | Unit tests and coverage                   |
| `@playwright/test`                                   | End-to-end tests                          |
| `knip`                                               | Dead-code / unused-dependency detection   |
| `jscpd`                                              | Duplicate-code detection                  |
| `@next/bundle-analyzer`                              | Bundle size analysis                      |
| `tailwindcss`                                        | Tailwind v4                               |
| `@types/*`                                           | Type definitions for node/react/react-dom |

## Notes

- **pnpm is required.** `devEngines.packageManager` pins pnpm 11.5.0 with `onFail: download`. CI installs with `--frozen-lockfile`, so `pnpm-lock.yaml` must be committed with any dependency change.
- **knip exceptions.** `eslint-config-next` and `tailwindcss` are listed in `knip.json` `ignoreDependencies` because they are used indirectly (config/PostCSS) rather than imported.
- **Doc drift.** `README.md` lists TanStack Query and Zod under the tech stack; these are no longer dependencies. Treat this page (derived from `package.json`) as authoritative. See [Lore](../lore.md).

For how these tools run, see [Tooling](../how-to-contribute/tooling.md).
