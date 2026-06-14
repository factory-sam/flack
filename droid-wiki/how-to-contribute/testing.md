# Testing

Flack has two test layers: fast Vitest unit tests for pure logic, and Playwright end-to-end smoke tests for routing and auth UI that run without a backend.

## Unit tests (Vitest)

Configured in `vitest.config.ts`: jsdom environment, globals enabled, test files matched by `src/**/*.test.ts(x)` and colocated with the code they cover.

```bash
pnpm test            # run once
pnpm test:coverage   # run with coverage
pnpm test:ci         # coverage + JUnit report (used in CI)
```

Current unit suites:

| File                                       | Covers                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/lib/utils.test.ts`                    | `cn`, `formatTime`, `initials`, `channelLabel`               |
| `src/features/messages/optimistic.test.ts` | `mergeIncomingMessage`, `markMessageFailed`, `removeMessage` |
| `src/lib/health.test.ts`                   | `checkReadiness` readiness logic (mocked fetch)              |
| `src/lib/logger.test.ts`                   | pino redaction and child-logger bindings                     |

### Coverage thresholds

Coverage is enforced on the pure logic layer only — `src/lib/utils.ts` and `src/features/messages/optimistic.ts` — at 100% statements/functions/lines and 90% branches. UI components are exercised by the e2e suite instead. When you add logic to those modules or extract new pure helpers, add unit tests so the gate stays green.

### Performance and flaky detection

`pnpm test:ci` writes `reports/junit.xml` with per-suite timing (uploaded as a CI artifact). Vitest flags tests slower than `slowTestThreshold` (300ms) and retries once locally / twice in CI, so a test that only passes on retry surfaces as flaky in the reports rather than silently passing.

## End-to-end tests (Playwright)

Specs live in `e2e/*.spec.ts`, configured in `playwright.config.ts`. The config boots the Next.js dev server on port 3100 with dummy `NEXT_PUBLIC_SUPABASE_*` env vars, so the public auth pages, the auth-guard redirect, and the `/health` endpoint can be tested without a running Supabase backend.

```bash
pnpm exec playwright install chromium   # first time only
pnpm test:e2e                           # headless
pnpm test:e2e:ui                        # Playwright inspector
```

Current specs:

| File                       | Covers                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/auth-routing.spec.ts` | unauthenticated redirect to `/login`, login/signup form rendering, magic-link toggle, submit-button validation, navigation between auth pages |
| `e2e/health.spec.ts`       | `/health` returns a structured readiness report with `no-store` caching                                                                       |

E2E tests that depend on an authenticated session require a real local Supabase stack (`supabase start`) and credentials; keep those separate from the no-backend smoke tests. Vitest and Playwright exclude each other's files.

## What to test where

- **Pure functions** (state transforms, formatting, readiness logic) → Vitest. Keep business logic in pure functions so it is testable without Supabase or the DOM. The optimistic message helpers are the model to follow — see [Realtime and optimistic UI](../features/realtime-and-optimistic.md).
- **Routing, redirects, and form rendering** → Playwright smoke tests (no backend).
- **Authenticated flows** → Playwright with a live local stack.
