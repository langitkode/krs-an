import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

/**
 * List active update events, optionally filtered by prodi.
 * Returns newest first.
 */
export const listActiveEvents = query({
  args: { prodi: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("update_events")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .collect();

    if (args.prodi) {
      return events.filter((e) => e.prodi === args.prodi);
    }
    return events;
  },
});

/**
 * Dismiss an event for the current user.
 * Anonymous users track dismiss via localStorage on the client.
 */
export const dismissEvent = mutation({
  args: { eventId: v.id("update_events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return; // anonymous — client-side dismiss only

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const alreadyDismissed = event.dismissed_by.includes(
      identity.tokenIdentifier,
    );
    if (alreadyDismissed) return;

    await ctx.db.patch(args.eventId, {
      dismissed_by: [
        ...event.dismissed_by,
        identity.tokenIdentifier,
      ],
    });
  },
});

/**
 * Admin mutation: manually create a banner event (e.g. maintenance notice).
 */
export const createEvent = mutation({
  args: {
    prodi: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const normalized = args.prodi.toUpperCase().trim().replace(/\.$/, "");
    return await ctx.db.insert("update_events", {
      prodi: normalized,
      type: args.type,
      title: args.title,
      message: args.message,
      severity: args.severity,
      dismissed_by: [],
      active: true,
    });
  },
});

/**
 * Deactivate an event (soft-delete / expire).
 */
export const deactivateEvent = mutation({
  args: { eventId: v.id("update_events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.eventId, { active: false });
  },
});

/**
 * Internal mutation called by bulkImportMaster after import.
 * Creates a course_import event for each prodi that got new rows.
 * Skips if an active event already exists for the same prodi+type
 * to avoid stacking duplicates on repeated imports.
 */
export const createAutoEvent = internalMutation({
  args: {
    prodi: v.string(),
    type: v.string(),
    inserted: v.number(),
    updated: v.number(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    const prodi = args.prodi.toUpperCase().trim().replace(/\.$/, "");

    const existing = await ctx.db
      .query("update_events")
      .withIndex("by_prodi", (q) => q.eq("prodi", prodi))
      .collect();
    // Deactivate previous events so repeated imports each get a fresh banner
    const stale = existing.filter(
      (e) => e.type === args.type && e.active,
    );
    await Promise.all(
      stale.map((e) => ctx.db.patch(e._id, { active: false })),
    );

    let title: string;
    let message: string;
    if (args.inserted > 0) {
      title = `${args.total} kelas diperbarui`;
      message = `Prodi ${prodi}: ${args.inserted} kelas baru, ${args.updated} kelas diperbarui.`;
    } else {
      title = `${args.total} kelas diperbarui`;
      message = `Prodi ${prodi}: ${args.total} kelas diperbarui.`;
    }

    await ctx.db.insert("update_events", {
      prodi,
      type: args.type,
      title,
      message,
      severity: "success",
      dismissed_by: [],
      active: true,
    });
  },
});
