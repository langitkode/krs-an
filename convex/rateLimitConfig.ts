import { defineRateLimits } from "convex-helpers/server/rateLimit";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * Rate limit configurations for all tiers.
 *
 * `checkRateLimit` — internalQuery (read-only status, no token consumed)
 * `rateLimit`      — internalMutation (reads + writes, consumes token)
 * `resetRateLimit` — internalMutation (clears a rate limit entry)
 *
 * Usage inside a mutation:
 *   await ctx.runMutation(internal.rateLimit.rateLimit, {
 *     name: "planWrite",
 *     key: user._id,
 *     throws: true,
 *   });
 *
 * Usage inside an action:
 *   same pattern — actions can also call ctx.runMutation().
 */
export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  // ── Tier 2: Anonymous mutations (per-device) ──────────────
  submitFeedback: { kind: "token bucket", rate: 3, period: 10 * SECOND, capacity: 5 },

  // ── Tier 3: Authenticated mutations (per-user) ───────────
  // Plan operations: save, delete, rename
  planWrite: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 20 },
  // Sharing: create share link
  createShareLink: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 10 },
  // User lifecycle: called on every auth transition
  ensureUser: { kind: "token bucket", rate: 5, period: SECOND, capacity: 10 },
  // User preferences: rarely used
  updatePreferences: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 20 },
  // Credit spending: already limited to 5/day, this is secondary defense
  generateToken: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 6 },
  // Smart generate: already has credit + manual 30s cooldown; secondary guard
  smartGenerate: { kind: "token bucket", rate: 1, period: 30 * SECOND, capacity: 1 },

  // ── Tier 4: Admin mutations (global) ─────────────────────
  adminMutations: { kind: "fixed window", rate: 30, period: MINUTE },
});
