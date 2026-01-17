import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // Clerk ID
    credits: v.number(), // Remaining generation credits
    lastResetDate: v.string(), // ISO date for daily reset
  }).index("by_token", ["tokenIdentifier"]),

  plans: defineTable({
    userId: v.id("users"),
    name: v.string(),
    data: v.string(), // JSON string of the plan
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  usage_logs: defineTable({
    userId: v.id("users"),
    type: v.string(), // "generate_plan" | "analyze"
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
});
