# Flack Runbooks

Operational runbooks (playbooks) for diagnosing and resolving production incidents in Flack.
Flack is a Next.js 16 app deployed on **Vercel** with a **Supabase Cloud** backend (Postgres,
Auth, Realtime). These runbooks are written so that an on-call engineer or an AI agent can act
without prior tribal knowledge.

## When to use these

Reach for a runbook when an alert fires, when `GET /health` reports `degraded`, or when users
report a broken experience. Start with [incident-response.md](./incident-response.md) for the
general triage flow, then jump to the specific runbook below.

## Runbook index

| Symptom                                                            | Runbook                                            |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| General incident triage, severity, comms, and roles                | [incident-response.md](./incident-response.md)     |
| `/health` is `503`/`degraded`, DB errors, realtime drops, timeouts | [supabase-degraded.md](./supabase-degraded.md)     |
| Users cannot log in / sign up / accept invites / sessions drop     | [auth-failures.md](./auth-failures.md)             |
| A bad deploy shipped a regression and needs to be reverted         | [deployment-rollback.md](./deployment-rollback.md) |

## Key references

- **Health endpoint:** `GET /health` returns `{ status, uptimeSeconds, timestamp, checks[] }`;
  `200` = ok, `503` = degraded. See [`src/lib/health.ts`](../../src/lib/health.ts).
- **Logging:** Structured `pino` logs via [`src/lib/logger.ts`](../../src/lib/logger.ts). Filter by
  the `scope` field (e.g. `auth.callback`, `health`). Sensitive fields are redacted.
- **Dashboards (fill in for your project):**
  - Vercel deployments & runtime logs: `https://vercel.com/<team>/flack` (Deployments, Logs tabs).
  - Supabase project health: `https://supabase.com/dashboard/project/<project-ref>` (Logs, Reports,
    Database > Health).
- **Status pages:** [Vercel Status](https://www.vercel-status.com/),
  [Supabase Status](https://status.supabase.com/).

## Conventions used in these runbooks

- **Severity** is defined in [incident-response.md](./incident-response.md). Triage severity first.
- Commands assume the [Supabase CLI](https://supabase.com/docs/guides/cli) and `gh` CLI are
  installed and authenticated (see [`AGENTS.md`](../../AGENTS.md)).
- Replace `<project-ref>`, `<team>`, and URL placeholders with the values for your environment.
