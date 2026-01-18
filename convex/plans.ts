import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save a generated plan to the archive
 */
export const savePlan = mutation({
  args: {
    name: v.string(),
    data: v.string(), // JSON string of the plan
    isSmartGenerated: v.optional(v.boolean()),
    generatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    const planId = await ctx.db.insert("plans", {
      userId: user._id,
      name: args.name,
      data: args.data,
      createdAt: Date.now(),
      isSmartGenerated: args.isSmartGenerated,
      generatedBy: args.generatedBy,
    });

    return planId;
  },
});

/**
 * List all archived plans for the current user
 */
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) return [];

    const plans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // SECURITY FIX: Add error handling for JSON parsing
    return plans.map((p) => {
      try {
        return {
          ...p,
          data: JSON.parse(p.data),
        };
      } catch (error) {
        console.error(`Failed to parse plan ${p._id}:`, error);
        return {
          ...p,
          data: null,
        };
      }
    });
  },
});

/**
 * Remove a plan from the archive
 */
export const deletePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== user._id) {
      throw new Error("Plan not found or unauthorized");
    }

    await ctx.db.delete(args.planId);
  },
});

/**
 * Rename an archived plan
 */
export const renamePlan = mutation({
  args: { planId: v.id("plans"), newName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== user._id) {
      throw new Error("Plan not found or unauthorized");
    }

    await ctx.db.patch(args.planId, { name: args.newName });
  },
});
