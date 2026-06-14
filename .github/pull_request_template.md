<!--
Thanks for contributing to Flack. Fill out each section so reviewers (human and AI) have the
context they need. PRs missing testing or context details may be sent back for more information.
-->

## Description

<!-- What does this PR change and why? Summarize the user-facing or developer-facing impact. -->

## Related issue

<!-- Link the issue this PR addresses, e.g. "Closes #123". Use "N/A" if none. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] Feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Refactor / tech debt (no functional change)
- [ ] Docs / tooling / CI

## Affected area

- [ ] auth (login/signup/invite/session)
- [ ] chat (workspace, channels)
- [ ] messages (send/edit/optimistic updates)
- [ ] realtime (Supabase subscriptions)
- [ ] supabase (schema, RLS, migrations)
- [ ] observability (logging, health)
- [ ] build / tooling / CI

## Testing done

<!-- Describe how you verified the change. Include commands run and their results. -->

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e` (if UI/routing changed)
- [ ] Manual verification (describe below)

<!-- Manual testing notes, screenshots, or `/health` output: -->

## Database / migrations

<!-- If this PR touches supabase/migrations or RLS policies, describe the change and how to apply it. Use "N/A" otherwise. -->

## Checklist

- [ ] My changes follow the conventions in `AGENTS.md`.
- [ ] I updated documentation (README/AGENTS.md) where relevant.
- [ ] No secrets, keys, or `.env` values are included in this PR.
