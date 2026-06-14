# Debugging

Where to look when something breaks, and the failure modes specific to Flack's Supabase-backed, RLS-enforced design.

## Structured logs

Server-side code logs through the `pino` logger in `src/lib/logger.ts`. Use `requestLogger(scope, context)` to tag lines with a scope (for example the auth callback logs under `scope: "auth.callback"`). Set `LOG_LEVEL` to control verbosity (`debug` in dev by default). Sensitive fields (`password`, `token`, `email`, `authorization`, `cookie`, and others) are redacted automatically. See [Observability](../systems/observability.md) and [How to monitor](../how-to-monitor.md).

## Health endpoint

Hit `GET /health` to check readiness. It returns a JSON report (`status`, `uptimeSeconds`, `timestamp`, `checks[]`) and probes Supabase connectivity at `${SUPABASE_URL}/auth/v1/health` with a 2s timeout. A `503` with `status: "degraded"` usually means the Supabase env is missing or the stack is down. The check logic is in `src/lib/health.ts`.

## Common failure modes

| Symptom                                         | Likely cause                                                   | Fix                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| "Missing Supabase environment variables" thrown | `.env.local` not set or empty                                  | Copy `.env.example` and fill values from `supabase start`. See [Configuration](../reference/configuration.md).                               |
| Queries silently return no rows                 | RLS policy denies access (not a network error)                 | Confirm the user's `org_id` and channel membership; reads are gated by `is_channel_member`/`current_org_id`. See [Security](../security.md). |
| Realtime messages never arrive                  | Not subscribed, or RLS on `realtime.messages` blocks the topic | Verify the client subscribed to `channel:<id>` and the user is a channel member.                                                             |
| New table feature "does nothing"                | RLS enabled but no policies, so clients can read/write nothing | Add explicit policies in the migration. See the [supabase-migration skill](tooling.md).                                                      |
| Sent message stuck/greyed out                   | Insert failed; the row was marked `failed`                     | Check the catch path in `sendMessage`; inspect the Supabase error. See [Realtime and optimistic UI](../features/realtime-and-optimistic.md). |
| Auth redirect loop                              | Session cookie not refreshed                                   | Ensure `middleware.ts` matcher covers the route; `updateSession` must run.                                                                   |
| `supabase db reset` fails                       | Bad SQL in a migration                                         | The CLI fails loudly; fix the offending migration against the conventions in `001_initial_schema.sql`.                                       |

## Inspecting data locally

`supabase start` runs Studio at `http://127.0.0.1:54323` for browsing tables and running SQL. Auth and invite emails are caught by Inbucket at `http://127.0.0.1:54324` (useful for confirming signups and grabbing magic links during local testing).

## Reproducing CI failures

CI runs the same commands you can run locally: `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, `pnpm knip`, `pnpm duplication`, `pnpm tech-debt`. If CI fails on dead code or unused deps, run `pnpm knip`; on duplication, run `pnpm duplication`. See [Tooling](tooling.md).
