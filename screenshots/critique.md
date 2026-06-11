# Flack Design Critique

Captured pages:

- `screenshots/login.png`, `/login`
- `screenshots/root.png`, `/`, unauthenticated redirect to `/login`
- `screenshots/not-found.png`, branded fallback 404

## Anti-Patterns Verdict

**Pass with reservations.** The login and 404 no longer read as a generic AI dashboard or centered SaaS marketing card. The new split-pane auth surface is flatter, denser, and closer to the technical command-workspace direction. The 404 is now product-owned and recoverable.

Remaining tells:

- The primary blue button is still a little too prominent and saturated for the otherwise quiet system.
- The right-side login metadata panel adds atmosphere, but its information value is low. It may become decorative if not made operational.
- Root and login are identical while unauthenticated, so the primary chat UI still needs authenticated screenshot review.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Disabled button state and auth messages exist, but field-level validation is still limited. |
| 2 | Match System / Real World | 3 | Password, magic link, and org-access language are clear. |
| 3 | User Control and Freedom | 3 | 404 now has clear workspace/sign-in recovery. Auth still lacks explicit invite help. |
| 4 | Consistency and Standards | 3 | Login now matches the flatter app system better. Chat shell still unverified in screenshots. |
| 5 | Error Prevention | 2 | Button disables invalid input, but failed password falling through to signup remains ambiguous. |
| 6 | Recognition Rather Than Recall | 3 | Auth controls and route recovery are recognizable. |
| 7 | Flexibility and Efficiency | 3 | Keyboard form flow is natural; explicit command/shortcut affordances are minimal on auth. |
| 8 | Aesthetic and Minimalist Design | 3 | Much stronger restraint; right-side metadata may still be nonessential. |
| 9 | Error Recovery | 3 | Branded 404 has recovery actions. Auth errors are still generic message blocks. |
| 10 | Help and Documentation | 2 | Invite and project-policy copy helps, but users still lack a next step if access fails. |
| **Total** | | **28/40** | **Solid foundation, primary chat experience still needs authenticated critique.** |

## Overall Impression

The auth and 404 pages now feel much closer to “technical, minimal, fast, precise.” The biggest improvement is that Flack now looks like a workspace system rather than a landing page. The remaining opportunity is to reduce accent weight, make auth consequences explicit, and capture the actual chat shell with a real session.

## What’s Working

1. **Auth layout now has product continuity:** The left pane and top rail mirror the app-shell structure instead of using a generic floating card.
2. **404 is no longer a framework leak:** It carries Flack styling and gives users clear recovery actions.
3. **Density and tone improved:** Smaller type, tighter rows, hairline borders, and restrained copy fit the Impeccable context.

## Priority Issues

### [P1] Authenticated chat UI is not yet captured

**Why it matters:** The primary product experience is the chat shell, but screenshots only cover unauthenticated redirect, login, and 404.

**Fix:** Use a real logged-in browser session and capture `/` after auth. Then re-run critique against the chat layout, message stream, composer, thread pane, and search palette.

**Suggested command:** `/audit`

### [P2] Password flow may create accounts after failed sign-in

**Why it matters:** This is surprising for a one-org SaaS and can create confusion around invite-only access.

**Fix:** Split sign-in from account creation/invites, or explicitly label the fallback behavior. Prefer “Continue” only signs in; invitation/signup should be a separate admin-driven path.

**Suggested command:** `/clarify`

### [P2] Primary accent is still a little loud

**Why it matters:** The saturated button competes with the quiet technical palette and draws more attention than the rest of the system.

**Fix:** Use accent only for enabled send/continue and active critical state, but reduce saturation or use a dark filled button with an accent border/focus ring.

**Suggested command:** `/colorize`

### [P3] Right-side login metadata risks becoming decoration

**Why it matters:** It currently states implementation facts but does not help users complete the task.

**Fix:** Make it operational (workspace status, auth method, environment, support contact) or remove it on smaller layouts.

**Suggested command:** `/distill`

## Cognitive Load Checklist

Failure count: **1/8, low**.

- Too many choices at primary decision point: pass, two auth modes is reasonable.
- Unclear primary action: pass, Continue is obvious.
- Related content grouped: pass.
- Excessive visual variation: pass.
- Requires recall: pass.
- Hidden consequences: fail, password failure can trigger signup.
- Missing recovery: pass, 404 now has recovery.
- Dense text or overload: pass.

## Emotional Journey

The experience now feels calm, system-like, and controlled. The 404 no longer creates an abrupt framework-branded valley. The biggest remaining emotional risk is auth failure: a rejected user still needs clear, non-blaming guidance about invitations or workspace access.

## Persona Red Flags

**Alex, power user:** Faster auth entry and denser layout fit expectations. Still needs authenticated chat validation and visible command behavior in the core shell.

**Jordan, first-time invited user:** Better invite copy helps, but they may still wonder whether password mode signs in, signs up, or requires an admin invite.

**Sam, admin/operator:** 404 recovery is good. Setup/debug still needs clearer auth failure details or admin contact path.

## Minor Observations

- The left auth pane feels intentionally product-like now.
- “Magic links expire by project policy” is precise but slightly evasive; show a real duration if known.
- `/` and `/login` screenshots are identical because unauthenticated root redirects as expected.
- The 404 layout has a large empty left rail, which is acceptable but could include workspace/account context later.

## Recommended Actions

1. **`/audit`** — Capture and critique the authenticated chat shell with a real login session.
2. **`/clarify`** — Make auth behavior explicit, especially invite requirements and signup fallback.
3. **`/colorize`** — Reduce the primary blue button’s dominance while preserving focus/active clarity.
4. **`/distill`** — Keep or remove the right-side auth metadata based on whether it becomes operational.
5. **`/polish`** — Final alignment pass after authenticated critique.

Re-run `/critique` after the authenticated capture to validate the actual chat surface.
