# Runbook: Incident Response (general)

Use this as the entry point for any production incident. It covers triage, severity, roles, and
communication. Once you have classified the incident, follow the specific runbook for the symptom.

## 1. Detect and confirm

- Confirm the problem is real and ongoing (not a one-off). Check `GET /health` on the affected
  environment:
  ```bash
  curl -fsS https://<your-flack-url>/health | jq .
  ```
  - `status: "ok"` (HTTP 200) -> app considers itself healthy; look at the client/feature layer.
  - `status: "degraded"` (HTTP 503) -> inspect the failing entry in `checks[]` (e.g. `supabase_env`,
    `supabase`) and go to [supabase-degraded.md](./supabase-degraded.md).
- Check the dashboards and status pages linked in [README.md](./README.md) (Vercel, Supabase).

## 2. Classify severity

| Severity | Definition                                                        | Response                      |
| -------- | ----------------------------------------------------------------- | ----------------------------- |
| SEV1     | Full outage or data loss; no users can use core chat/auth         | Drop everything; page on-call |
| SEV2     | Major feature broken (e.g. realtime down, login failing) for many | Respond within 30 min         |
| SEV3     | Partial/degraded experience or affecting a subset of users        | Same business day             |
| SEV4     | Minor/cosmetic; no functional impact                              | Track as a normal issue       |

## 3. Assign roles (even for a team of one, name them explicitly)

- **Incident Commander (IC):** coordinates, makes the call on mitigation vs. rollback, owns comms.
- **Operations:** executes the technical steps from the relevant runbook.
- **Scribe:** records a timeline (timestamps, actions, results) for the postmortem.

## 4. Communicate

- Open a tracking issue using the bug template (`type: bug`, `priority: p0-critical` or
  `p1-high`) and keep a running status in it.
- Post status updates at a regular cadence (every 15-30 min for SEV1/SEV2) to your team channel.
- For customer-facing outages, update your external status page if you have one.

## 5. Mitigate

Prefer the fastest safe mitigation over a root-cause fix during an active incident:

- If the incident started right after a deploy -> [deployment-rollback.md](./deployment-rollback.md).
- If Supabase is the source -> [supabase-degraded.md](./supabase-degraded.md).
- If auth specifically is broken -> [auth-failures.md](./auth-failures.md).

## 6. Verify recovery

- `GET /health` returns `200 ok`.
- Smoke test the critical path: sign in, open a workspace, send a message, confirm it appears in
  realtime in a second session.
- Confirm error/log volume in Vercel and Supabase logs has returned to baseline.

## 7. Post-incident

- Within 48 hours, write a blameless postmortem: timeline, impact, root cause, and action items.
- File follow-up issues for each action item and link them from the postmortem.
- Update the relevant runbook if any step was missing, wrong, or slow.
