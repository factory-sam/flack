# How to monitor

What's available today for seeing what Flack is doing in production. The app ships with structured logging and a readiness endpoint; metrics, tracing, and alerting are not yet wired up.

## Logging

Server-side code logs through the `pino` logger in `src/lib/logger.ts`. Logs are structured JSON with an ISO timestamp and a `service: "flack"` base field, so they can be ingested and queried by any JSON-aware log backend (for example Vercel's log drains).

- **Level:** controlled by `LOG_LEVEL`; defaults to `info` in production, `debug` in development.
- **Scopes:** use `requestLogger(scope, context)` to tag lines (for example `scope: "auth.callback"`, `scope: "health"`). Filter by `scope` when querying.
- **Severity conventions:** `warn` for recoverable failures, `error` (with an `{ err }` field) for unexpected failures, `info` for lifecycle events.
- **Redaction:** sensitive fields (`password`, `token`, `email`, `authorization`, `cookie`, and related) are emitted as `[redacted]`. Pass whole objects through the logger so redaction applies — see [Observability](systems/observability.md).

To add a log statement, import `logger` or `requestLogger` from `@/lib/logger` in server code (never in Edge middleware) and log an object plus a message string.

## Health and readiness

`GET /health` returns a JSON readiness report and is the primary signal for uptime monitors and deploy smoke checks:

```json
{
  "status": "ok",
  "uptimeSeconds": 42,
  "timestamp": "...",
  "checks": [
    { "name": "supabase_env", "status": "pass" },
    { "name": "supabase", "status": "pass", "durationMs": 12 }
  ]
}
```

It returns `200` when ready and `503` (`status: "degraded"`) when the Supabase env is missing or the Supabase Auth health probe fails within 2 seconds. The check is implemented in `src/lib/health.ts` and served by `src/app/health/route.ts`. Point an external monitor at `<deployed-url>/health` and alert on non-200 responses.

## Not yet instrumented

The following are intentionally absent today and would be the natural next steps for production observability:

- **Metrics** (request rates, latency, error counts) — no Prometheus/Datadog/OpenTelemetry instrumentation.
- **Distributed tracing** — no request-id propagation across the stack.
- **Alerting** — no PagerDuty/OpsGenie rules; alerting currently relies on whatever your log/uptime provider offers.

If you add any of these, document them here and extend the readiness `checks` array in `src/lib/health.ts` where it makes sense.
