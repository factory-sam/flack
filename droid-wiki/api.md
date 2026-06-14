# API and route handlers

Flack has no standalone REST/GraphQL API. The browser and server talk to Supabase directly. The "API surface" is therefore two things: a small set of Next.js route handlers, and the Postgres functions exposed as Supabase RPCs.

## Route handlers

| Route                | File                             | Runtime | Purpose                                                                                                                          |
| -------------------- | -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/callback` | `src/app/auth/callback/route.ts` | Node    | Exchanges the magic-link/OAuth `code` for a session, then accepts an `invite_token` if present. Redirects to `/`.                |
| `GET /health`        | `src/app/health/route.ts`        | Node    | Returns a readiness report; `200` ok / `503` degraded, `Cache-Control: no-store`. See [Observability](systems/observability.md). |

Both are marked `dynamic = "force-dynamic"` / `runtime = "nodejs"`. The auth callback is the redirect target for sign-in and invite flows (see [Authentication](features/authentication.md)).

### `/health` response shape

```json
{
  "status": "ok",
  "uptimeSeconds": 42,
  "timestamp": "2026-06-12T00:00:00.000Z",
  "checks": [
    { "name": "supabase_env", "status": "pass" },
    { "name": "supabase", "status": "pass", "durationMs": 12 }
  ]
}
```

## Postgres RPCs (Supabase functions)

These are called from the client via `supabase.rpc(...)` and typed in `src/types/database.ts` under `Functions`. They are `security definer`, so they enforce their own authorization.

| RPC               | Args                           | Returns                     | Notes                                                                                               |
| ----------------- | ------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `create_invite`   | `invite_email`, `invite_role?` | `{ id, token, expires_at }` | Admin-only; raises if caller is not an org admin. Returns a raw token (stored hashed).              |
| `accept_invite`   | `invite_token`                 | `org_id` (uuid)             | Validates token hash, expiry, and email match; joins the caller to the org and its public channels. |
| `search_messages` | `query_text`, `limit_count?`   | ranked rows                 | Full-text search filtered to the caller's channels. See [Search](features/search.md).               |

Internal helper functions (`current_org_id`, `is_admin`, `is_channel_member`, `add_member_to_public_channels`, `create_default_channels`) are used by policies and other functions rather than called directly from the client. See [Data models](reference/data-models.md).

## Realtime "API"

Clients subscribe to a broadcast topic named `channel:<channel_id>` and receive `INSERT`/`UPDATE`/`DELETE` events plus `typing` and presence. Subscription is RLS-gated on `realtime.messages`. The contract and reconciliation are covered in [Realtime and optimistic UI](features/realtime-and-optimistic.md).

## Storage

File attachments use the private `attachments` Supabase Storage bucket (50 MiB limit), with object-level RLS keyed on the channel id encoded in the storage path. See [Messaging](features/messaging.md) and [Security](security.md).
