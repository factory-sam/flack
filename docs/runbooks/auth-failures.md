# Runbook: Authentication Failures

**Symptoms:** users cannot log in or sign up, invite links fail, users are unexpectedly logged out
or bounced back to `/login`, or the OAuth/magic-link callback errors.

Relevant code: [`src/app/auth/callback/route.ts`](../../src/app/auth/callback/route.ts),
[`src/lib/supabase/`](../../src/lib/supabase/), and the auth forms in
[`src/features/auth/`](../../src/features/auth/).

## Triage

1. Search server logs for the auth scope (logs are structured JSON via `pino`):
   ```bash
   # Vercel: Project > Logs, filter for the callback route, or via CLI:
   vercel logs <deployment-url> | grep '"scope":"auth.callback"'
   ```
   The callback handler logs exchange and invite errors at `error`/`warn` with context.
2. Determine the failing step: sign-in, sign-up, invite acceptance, or session persistence.

## Cause A: Redirect URL not allowlisted

The most common cause after a domain or environment change.

1. In the Supabase dashboard: Authentication > URL Configuration.
2. Ensure **Site URL** and **Redirect URLs** include the current deployment, including
   `<site-url>/auth/callback`. Preview deployments use a different URL than production.
3. Confirm `NEXT_PUBLIC_SITE_URL` in Vercel matches the deployment origin so generated links point
   at the right host.

## Cause B: Expired or already-used links (magic link / invite)

- Magic links and invites are single-use and time-limited. A failed exchange that logs
  "code exchange failed" usually means the link expired or was reused.
- Mitigation: have the user request a fresh link / re-send the invite. Check the email provider's
  delivery logs if links are not arriving (Authentication > Providers / email settings).

## Cause C: Key rotation or env mismatch

- If `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` was rotated/changed, all
  in-flight sessions and links break. Update Vercel env vars and redeploy
  (see [supabase-degraded.md](./supabase-degraded.md#cause-a-missing-or-wrong-environment-variables)).
- **Never** use the service-role key in client-side env vars; only the publishable/anon key.

## Cause D: RLS or session row issues

- If login succeeds but the user lands with no workspace/permissions, the problem is likely an RLS
  policy or a missing membership row, not auth itself. Verify the user's membership in the relevant
  organization/workspace table and review the policies in `supabase/migrations/`.
- Do **not** disable RLS to "fix" this; correct the data or policy.

## Verify recovery

- Complete a full sign-up -> confirm -> sign-in -> open workspace flow in an incognito window.
- Accept a fresh invite end-to-end.
- Confirm session persists across a page reload.

## Escalation

- Suspected account takeover or leaked credentials -> rotate keys immediately, force sign-out
  (invalidate sessions in Supabase Auth), and treat as a security incident.
