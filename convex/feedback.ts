import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthedUser, requireAdmin } from "./lib";

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

    // --- duplicate guard: same tokenId + saveCount ---
    if (tokenId) {
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

/** Admin-only: list all feedback, newest first. */
export const listFeedback = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("feedback")
      .order("desc")
      .collect();
  },
});
