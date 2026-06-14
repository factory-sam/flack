# Runbook: Deployment Rollback

**Symptoms:** a regression appeared immediately after a deploy: elevated error rate, a broken
critical path (auth/chat/messages), or `/health` degraded right after shipping.

Flack deploys to **Vercel** (frontend/server) with schema changes applied to **Supabase Cloud** via
migrations.

## 1. Confirm the deploy is the cause

1. In Vercel > Deployments, note the time of the most recent Production deploy and compare it to when
   the symptoms started.
2. Compare the bad deploy's commit against the previous good one:
   ```bash
   gh api repos/factory-sam/flack/deployments --jq '.[0:5] | .[] | {sha: .sha, env: .environment, created: .created_at}'
   ```

## 2. Roll back the application (fast mitigation)

Prefer Vercel's instant rollback to redeploying:

- **Dashboard:** Vercel > Deployments > select the last known-good deployment > **Promote to
  Production** (instant rollback; no rebuild).
- **CLI:**
  ```bash
  vercel rollback <previous-good-deployment-url>
  ```

This restores the previous app build in seconds. Verify with `GET /health` and a smoke test.

## 3. Handle database migrations carefully

Application rollback does **not** revert database schema changes. If the bad deploy included a
migration in `supabase/migrations/`:

- **Additive change** (new nullable column/table, no drops): usually safe to leave; the old app build
  ignores it. Prefer leaving it and fixing forward.
- **Destructive/breaking change** (dropped or renamed column, type change the old build depends on):
  the old build may now be broken against the new schema. Options, in order of preference:
  1. **Fix forward** with a new migration + deploy that reconciles the schema.
  2. Apply a carefully written reverse migration:
     ```bash
     # Write a new migration that undoes the breaking change, then:
     supabase db push
     ```
     Never hand-edit or delete an already-applied migration file; always roll forward with a new one.

## 4. Stop the bleeding in source control

- Revert the offending commit so `main` reflects the rolled-back state:
  ```bash
  git revert <bad-commit-sha>
  ```
- Open a PR using the PR template; mark it `priority: p1-high`. CI (Code Quality) must pass before
  merge.

## 5. Verify recovery

- `GET /health` returns `200 ok`.
- Smoke test sign-in, open workspace, send/receive a message in realtime.
- Error/log volume in Vercel and Supabase returns to baseline.

## 6. Follow up

- File a postmortem (see [incident-response.md](./incident-response.md)) and capture why the
  regression was not caught pre-merge (missing test, gap in e2e coverage, etc.).
- Add a regression test (`vitest` unit or Playwright e2e) so the same break is caught next time.
