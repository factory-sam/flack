# Flack Onboarding and Core UI Critique

Captured pages:

- `create-org-empty.png`, `/signup` redirected to create workspace mode.
- `create-org-filled.png`, create workspace form populated, not submitted.
- `sign-in.png`, `/login`.
- `invite-accept.png`, `/invite/[token]` redirected to invite acceptance mode.
- `not-found.png`, branded 404.

Note: I did not submit the create-org form because it would write to the configured Supabase project. Core chat UI was reviewed from implementation because authenticated capture requires a real logged-in session.

## Anti-Patterns Verdict

**Partial pass.** This no longer looks like a generic AI dashboard: no gradients, no glow stack, no glassmorphism, no icon-card grid, and the surface is flat and technical. The risk now is the opposite: the onboarding is so austere that it feels under-explained. It has the “command surface” aesthetic, but not enough product guidance for a first-time admin creating a new tenant.

Remaining tells:

- The right-hand metadata panel reads like scaffolding, not operational UI.
- The primary blue button is still louder than the rest of the palette.
- All auth modes share one title, “Sign in to Flack,” even when the user is creating a workspace.
- Empty/first-run chat states in source are too terse (“No messages yet”, “Select a message”) for onboarding.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Form enable/disable works, but no password rules, org availability, invite validity, or pending submission detail. |
| 2 | Match System / Real World | 3 | Tenant language is mostly clear, but “organization” and “workspace” are used interchangeably. |
| 3 | User Control and Freedom | 3 | Users can switch auth modes and 404 recovery works. No clear path back from invite mode except tab switching. |
| 4 | Consistency and Standards | 3 | Visual system is consistent across auth and 404. Core shell source uses the same tokens. |
| 5 | Error Prevention | 2 | Create-org can be submitted without explaining irreversible admin/org creation consequences. |
| 6 | Recognition Rather Than Recall | 3 | Modes and fields are recognizable. Invite flow depends on knowing the invited email. |
| 7 | Flexibility and Efficiency | 3 | Keyboard form flow and compact layout fit power users. Create-org flow could be faster with field labels and autofill hints. |
| 8 | Aesthetic and Minimalist Design | 3 | Strong restraint, but the right rail adds low-value text. |
| 9 | Error Recovery | 2 | 404 is good. Auth/invite failures are generic and not actionable enough. |
| 10 | Help and Documentation | 2 | First admin, invite, and tenant model are hinted at but not explained at the moment of decision. |
| **Total** | | **26/40** | **Strong visual direction, weak first-run guidance.** |

## Overall Impression

The product now has a coherent technical tone, but onboarding asks users to make high-stakes choices with very little explanation. “Create workspace” is the most important first-run moment, and it currently feels like filling one more login tab rather than founding a new tenant. The core UI source shows good density, but admin/invite creation is tucked into the sidebar and may be missed.

## What’s Working

1. **The create-org mode is compact and direct.** Email, password, organization name, submit, no marketing detour.
2. **Invite mode is distinct enough.** “Join an organization” and “Accept invite” correctly shift the user’s mental model.
3. **Visual system is no longer slop.** Flat planes, hairline borders, small typography, and minimal color match the Impeccable context.

## Priority Issues

### [P1] Create-org flow does not feel like tenant creation

**Why it matters:** The first user is creating a new organization and becoming its admin. That is a structural product decision, but the UI makes it feel like a lightweight auth variant.

**Fix:** Give create mode its own title and confirmation language: “Create organization,” “You’ll be the first admin,” “Default channels will be created.” Consider a compact review row before submission, not a modal.

**Suggested command:** `/onboard`

### [P1] Auth mode tabs overload one screen with three different jobs

**Why it matters:** Sign in, magic link, and create workspace are different intents. Putting all three in equal tabs increases ambiguity and makes create-org feel less deliberate.

**Fix:** Keep Sign in and Magic link as the primary auth surface, then expose “Create a new organization” as a secondary command/link that opens create mode. Invite links should go straight to invite mode.

**Suggested command:** `/distill`

### [P1] Core app first-run states are too empty

**Why it matters:** After creating an org, the admin needs to know what happened and what to do next: invite teammates, post in `#general`, create channels. Source currently shows “No messages yet” and a hidden sidebar invite form.

**Fix:** Add first-run admin states in the chat shell: `#general` empty state with two or three command-like actions (“Invite teammate”, “Post first update”, “Create channel”). Keep it compact.

**Suggested command:** `/onboard`

### [P2] Admin invites are low-discoverability in the sidebar

**Why it matters:** Invites are a core tenant onboarding action, but the current UI places a tiny email field under People. It looks like utility plumbing, not the next best action.

**Fix:** Move invite creation into a clearer admin row or first-run panel. After invite creation, show the copied link, expiry, and “copy again” action.

**Suggested command:** `/arrange`

### [P2] Microcopy is precise but not actionable enough

**Why it matters:** “Create makes you admin of a new organization” is accurate, but it does not explain what happens next or how invites work. Error states are still raw messages.

**Fix:** Use concise operational copy: “Creates org, #general, #random, and makes you admin.” “Invite links are valid for 7 days.” “Use the exact invited email.”

**Suggested command:** `/clarify`

## Cognitive Load Checklist

Failure count: **3/8, moderate**.

- Too many choices at decision point: fail, three equal auth modes compete.
- Unclear primary action: pass, selected mode primary button is clear.
- Related content grouped: pass.
- Excessive visual variation: pass.
- Requires recall: fail, user must infer what creating an org does.
- Hidden consequences: fail, admin role/default channels are not explicit before submit.
- Missing recovery: pass, 404 recovery exists.
- Dense text or overload: pass, the issue is under-explanation, not overload.

## Emotional Journey

The interface feels calm and professional, which matches the brand. But the create-org moment lacks confidence-building. A first admin should feel “I know exactly what this will set up,” not “I hope this login form creates the right thing.” The experience ends weakly unless email confirmation immediately leads to a clear first-run workspace state.

## Persona Red Flags

**Alex, power user:** The compact flow is fast, but Alex has to infer consequences. The invite action in the core UI may be too hidden for quick team setup.

**Jordan, first-time admin:** The three tabs create ambiguity. Jordan may not understand whether “Create” creates a user account, an organization, or both. High risk of hesitation.

**Morgan, operator/admin:** Wants tenant setup confidence. Missing details: default channels, admin role, invite expiry, and what happens after confirming email.

## Minor Observations

- `/signup` redirects to `/login?mode=signup`; acceptable technically, but the URL and title still say login/sign-in.
- “Single-org realtime chat” conflicts with the new multi-tenant model.
- “Magic link” in create-org mode is visually equal even though it cannot create an organization.
- The 404 page is solid, but the primary blue button is still louder than necessary.
- Field placeholders stand in for labels; this is compact, but weak for accessibility and autofill clarity.

## Recommended Actions

1. **`/onboard`** — Create a stronger first-run path: explicit create-organization mode, post-confirmation workspace empty state, and admin next actions.
2. **`/distill`** — Split auth intents so “Create organization” is a deliberate path, not an equal tab beside sign-in.
3. **`/arrange`** — Reposition invites as a prominent admin onboarding action in the core shell.
4. **`/clarify`** — Tighten copy around admin role, default channels, invite expiry, exact invited email, and auth errors.
5. **`/colorize`** — Reduce the primary button’s saturation so accent is meaningful but not dominant.
6. **`/polish`** — Final consistency pass after first-run and invite changes.

Re-run `/critique` after authenticated capture to score the real chat shell.
