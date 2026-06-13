# Runbook: Supabase Degraded / Database Errors

**Symptoms:** `GET /health` returns `503` with a failing `supabase` or `supabase_env` check;
messages fail to load or send; realtime updates stop arriving; server logs show Supabase request
errors or timeouts.

## Quick triage

1. Hit the health endpoint and read the failing check:
   ```bash
   curl -fsS https://<your-flack-url>/health | jq '.status, .checks'
   ```
   - `supabase_env` failing -> environment variables are missing/misconfigured. Go to
     [Cause A](#cause-a-missing-or-wrong-environment-variables).
   - `supabase` failing with `auth health returned <code>` or a network error -> Supabase is
     unreachable or unhealthy. Go to [Cause B](#cause-b-supabase-unreachable-or-unhealthy).
2. Check the [Supabase status page](https://status.supabase.com/) for a platform incident.

## Cause A: Missing or wrong environment variables

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see
[`src/lib/supabase/env.ts`](../../src/lib/supabase/env.ts) and `.env.example`).

1. In Vercel, open Project > Settings > Environment Variables and confirm both are set for the
   affected environment (Production/Preview) and match the Supabase project's API settings.
2. If you just rotated keys, redeploy so the new values take effect (env changes require a new
   deployment).
3. Re-check `/health`. `supabase_env` should now pass.

## Cause B: Supabase unreachable or unhealthy

1. Confirm the project is up in the Supabase dashboard (Database > Health, Logs).
2. Probe Supabase Auth directly (this is what the health check does):
   ```bash
   curl -fsS -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health"
   ```
3. **Connection pool exhausted / "too many connections":** check Database > Reports for connection
   spikes. Reduce load or scale the instance; ensure server code is not opening clients in hot loops.
4. **Paused/over-quota project:** free-tier projects pause after inactivity and can hit quota limits.
   Resume or upgrade the project in the dashboard.
5. **Platform incident:** if the status page shows an outage, there is no app-side fix. Communicate
   the dependency outage (see [incident-response.md](./incident-response.md)) and monitor until
   Supabase recovers.

## Realtime specifically

- If pages load but live message updates stop, the issue is the Realtime channel, not the REST/DB
  layer. Verify Realtime is enabled for the relevant tables in the Supabase dashboard
  (Database > Replication) and that RLS policies still permit the subscribed reads.
- A client reconnect (reload) is the user-side mitigation while you investigate.

## Verify recovery

- `GET /health` returns `200 ok` with all `checks` passing.
- Send a message in one session and confirm it appears in a second session within ~1s.

## Escalation

- Platform-level outage with no ETA -> escalate to a project admin to consider a maintenance notice.
- Suspected data integrity problem (missing/duplicated rows) -> stop writes if feasible and engage a
  database owner before mutating data.
