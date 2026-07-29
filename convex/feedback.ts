import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthedUser, requireAdmin } from "./lib";
import { rateLimit } from "./rateLimitConfig";

const MAX_MESSAGE_LENGTH = 500;

/**
 * Submit user feedback with star rating + optional message.
 *
 * Tolerant of anonymous users (no auth required). Client should sanitize HTML
 * before sending; this mutation validates range/length and rejects duplicates
 * (same user + same saveCount).
 */
export const submit = mutation({
  args: {
    rating: v.number(),
    message: v.optional(v.string()),
    saveCount: v.number(),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // --- validation ---
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }

    const msg = args.message?.trim() || "";
    if (msg.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must not exceed ${MAX_MESSAGE_LENGTH} characters`);
    }

    // --- identity ---
    const user = await getAuthedUser(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const tokenId = identity?.tokenIdentifier;
    const email = identity?.email || user?.email;

    // --- rate limiting ---
    // Rate-limit both anonymous and authed callers. Previously only anonymous
    // callers were throttled (keyed by anonymousId); signed-in users had no
    // throttle on voluntary submissions at all.
    const rateLimitKey = tokenId || args.anonymousId;
    if (rateLimitKey) {
      await rateLimit(ctx, { name: "submitFeedback", key: rateLimitKey, throws: true });
      if (args.saveCount === 0) {
        await rateLimit(ctx, { name: "submitFeedbackVoluntary", key: rateLimitKey, throws: true });
      }
    }

    // --- duplicate guard: same tokenId + saveCount ---
    // saveCount 0 means the user opened the dialog manually (Saran link in
    // Footer/Navbar), not from a save-milestone trigger. There is no meaningful
    // "already submitted at this milestone" for ad-hoc submissions, so skip
    // deduplication entirely and always allow them through.
    if (tokenId && args.saveCount !== 0) {
      const existing = await ctx.db
        .query("feedback")
        .filter((q) =>
          q.and(
            q.eq(q.field("tokenIdentifier"), tokenId),
            q.eq(q.field("saveCount"), args.saveCount),
          ),
        )
        .first();
      if (existing) {
        throw new Error("Feedback already submitted for this milestone");
      }
    }

    // --- insert ---
    await ctx.db.insert("feedback", {
      userId: user?._id,
      tokenIdentifier: tokenId,
      email,
      rating: args.rating,
      message: msg || undefined,
      saveCount: args.saveCount,
      createdAt: Date.now(),
    });
  },
});

/** Admin-only: list all feedback, newest first, paginated. */
export const listFeedback = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("feedback")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
