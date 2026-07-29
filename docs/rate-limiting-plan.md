# Rate Limiting — Implementation Plan

## Constraint: Queries Cannot Be Counter-Rate-Limited

Convex **queries** are read-only + synchronous. Cannot:
- Call `ctx.runMutation()` (no `rateLimit` token consumption)
- Make HTTP calls (no Upstash Redis)
- Write to DB

So server-side counter-based rate limiting only works for **mutations** and **actions**.

### Strategy

| Function type | Server rate limit? | Mechanism |
|---|---|---|
| Query | No (impossible) | Client-side caching (React Query staleTime) |
| Mutation | Yes | convex-helpers `rateLimit` |
| Action | Yes | convex-helpers `rateLimit` via `ctx.runMutation()` |
| `smartGenerate` action | Yes | Option A: convex-helpers. Option B: Upstash Redis directly |

---

## Sprint 0: Setup

### Files to create

**`convex/rateLimitConfig.ts`** — Define all rate limit configs + export helpers

```typescript
import { defineRateLimits } from "convex-helpers/server/rateLimit";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  // Tier 2: Anonymous mutations (per device)
  submitFeedback: { kind: "token bucket", rate: 3, period: 10 * SECOND, capacity: 5 },

  // Tier 3: Authenticated mutations (per user)
  planWrite: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 20 },
  createShareLink: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 10 },
  ensureUser: { kind: "token bucket", rate: 5, period: SECOND, capacity: 10 },
  updatePreferences: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 20 },
  generateToken: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 6 },
  smartGenerate: { kind: "token bucket", rate: 1, period: 30 * SECOND, capacity: 1 },

  // Tier 4: Admin mutations (global)
  adminMutations: { kind: "fixed window", rate: 30, period: MINUTE },
});
```

### Files to modify

**`convex/schema.ts`** — Add `rateLimits` table

```typescript
rateLimits: defineTable({
  name: v.string(),
  key: v.optional(v.string()),
  ts: v.number(),
  value: v.number(),
}).index("nameKey", ["name", "key"]),
```

**`package.json`** — Add dependency

```
"convex-helpers": "^0.1.74"
```

---

## Sprint 1: Mutation Rate Limiting

### Pattern for each mutation

```typescript
// Before: direct auth + logic
handler: async (ctx, args) => {
  const user = await requireUser(ctx);
  // ... logic
}

// After: add rate limit check
handler: async (ctx, args) => {
  const user = await requireUser(ctx);
  await ctx.runMutation(internal.rateLimit.rateLimit, {
    name: "planWrite",
    key: user._id,
    throws: true,
  });
  // ... logic
}
```

### Files to modify

| File | Functions | Config name | Key |
|---|---|---|---|
| `convex/plans.ts` | `savePlan`, `deletePlan`, `renamePlan` | `planWrite` | `user._id` |
| `convex/plans.ts` | `createShareLink` | `createShareLink` | `user._id` |
| `convex/users.ts` | `ensureUser` | `ensureUser` | `user._id` |
| `convex/users.ts` | `updatePreferences` | `updatePreferences` | `user._id` |
| `convex/users.ts` | `generateServiceToken` | `generateToken` | `user._id` |
| `convex/feedback.ts` | `submit` | `submitFeedback` | anonymousId arg |
| `convex/admin.ts` | All admin mutations | `adminMutations` | global (no key) |

### Import pattern

```typescript
import { internal } from "./_generated/api";
```

### Anonymous ID for feedback

Add optional `anonymousId` arg to `feedback.submit`. Client generates once via `crypto.randomUUID()`, stores in `localStorage` as `krs-anon-id`.

---

## Sprint 2: Action Rate Limiting (smartGenerate)

### convex-helpers approach (recommended for Phase 1)

In `convex/ai.ts` `smartGenerate` action, after auth check:

```typescript
const { ok, retryAt } = await ctx.runMutation(internal.rateLimit.rateLimit, {
  name: "smartGenerate",
  key: user._id,
  count: 1,
  throws: false,
});
if (!ok) {
  throw new ConvexError({
    message: "Please wait before generating again",
    retryAt,
  });
}
```

### Upstash Redis approach (Phase 2 option)

Replace `RATE_LIMIT_MS` constant + `lastSmartGenerateTime` field with:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(1, "30 s"),
  analytics: true,
});

// In action handler:
const { success, reset } = await ratelimit.limit(`smartgen:${user._id}`);
if (!success) {
  throw new ConvexError({
    message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s`,
  });
}
```

Upstash env vars set as Convex deployment env vars via dashboard.

---

## Sprint 3: Frontend

### Files to create

**`src/lib/anonymousId.ts`** — Anonymous device ID

```typescript
const STORAGE_KEY = "krs-anon-id";

export function getAnonymousId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
```

### Files to modify

**`src/lib/utils.ts`** — Add `isRateLimitError` helper

```typescript
// Check if an error is a Convex rate limit error
export function isRateLimitError(error: unknown): error is ConvexError<{ retryAfter?: number; retryAt?: number; name?: string }> {
  return error instanceof ConvexError && 
    typeof error.data === 'object' && error.data !== null &&
    ('retryAfter' in error.data || 'retryAt' in error.data);
}
```

**Call sites** — Wrap mutation error handlers

For each mutation call that can be rate limited, add:

```typescript
.catch((error) => {
  if (isRateLimitError(error)) {
    toast.error(t("toast.rate_limit_exceeded"), {
      description: `Try again in ${Math.ceil((error.data.retryAt - Date.now()) / 1000)}s`,
    });
    return;
  }
  // ... existing error handling
})
```

**React Query staleTime for public queries** — If not already set, add `staleTime` to `useQuery` calls for course data

### i18n keys to add

```typescript
"toast.rate_limit_exceeded": "Too many requests",
```

---

## DB I/O Impact Analysis

### Without rate limiting (current)
- 473 MB/month DB I/O

### With rate limiting (convex-helpers mutations only)
- Each rate limited mutation: 1 read + 1 write to `rateLimits` table (~200 bytes)
- Total mutations/month affected: ~5K (savePlan 1.6K + ensureUser 2.3K + others ~1K)
- Added overhead: ~5K × 200 bytes = **~1 MB/month** (+0.2%)
- Plus admin mutations: ~15 admin mutation calls/month = negligible

### Mutations excluded from rate limiting (no meaningful risk)
- `admin.pingAdmin` — returns string literal, no DB read
- `plans.listPlans` — query (can't rate limit), anon-tolerant
- `users.getCurrentUser` — query (can't rate limit), anon-tolerant

### Net DB I/O change
- Current: 473 MB/month
- After: ~474 MB/month (+0.2%)
- Still well within 1 GB limit

---

## Excluded: Public Query Rate Limiting

As established, server-side rate limiting is **impossible** for Convex queries. For query cost optimization:

1. **React Query staleTime** — Cache course catalog data (5-10 min TTL)
2. **Client-side debounce** — Search inputs already debounced at 300ms
3. **Monitor** — If query abuse becomes a problem, consider:
   - Reverse proxy (Cloudflare) in front of Convex
   - Convert high-cost queries to actions (trade reactivity for rate limitability)

Current query costs are within budget. No action needed now.

---

## Phasing

| Sprint | Scope | Files |
|---|---|---|
| 0 | Setup | package.json, schema.ts, rateLimitConfig.ts |
| 1 | Mutation RL | plans.ts, users.ts, feedback.ts, admin.ts |
| 2 | Action RL | ai.ts |
| 3 | Frontend | anonymousId.ts, utils.ts, call sites, i18n |
| 4 (optional) | Upstash | ai.ts, convex env vars |
