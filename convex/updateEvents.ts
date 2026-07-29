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
 * Paginated history of all events (active + inactive) for a prodi.
 * Ordered newest-first. Used by the history dialog.
 */
export const listEventHistory = query({
  args: {
    prodi: v.string(),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("update_events")
      .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi))
      .order("desc")
      .paginate(args.paginationOpts);
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
 * Internal mutation called by import/split/delete operations.
 * Always creates a fresh event and deactivates the previous active one
 * for the same prodi+type — so each event is an accurate snapshot of
 * one operation with its own timestamp. No unbounded accumulation.
 */
export const createAutoEvent = internalMutation({
  args: {
    prodi: v.string(),
    type: v.string(),
    inserted: v.optional(v.number()),
    updated: v.optional(v.number()),
    deleted: v.optional(v.number()),
    total: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const prodi = args.prodi.toUpperCase().trim().replace(/\.$/, "");
    const ins = args.inserted ?? 0;
    const upd = args.updated ?? 0;
    const del = args.deleted ?? 0;
    const tot = ins + upd + del;

    if (tot === 0) return; // Nothing changed

    // Generate rich title based on modification type
    let title = "Jadwal kuliah diperbarui";
    if (ins > 0 && upd === 0 && del === 0) {
      title = `${ins} kelas baru ditambahkan`;
    } else if (del > 0 && ins === 0 && upd === 0) {
      title = `${del} kelas dihapus`;
    } else if (upd > 0 && ins === 0 && del === 0) {
      title = `${upd} kelas diperbarui`;
    } else {
      title = `${tot} perubahan jadwal kelas`;
    }

    // Generate descriptive detail message
    const parts: string[] = [];
    if (ins > 0) parts.push(`${ins} kelas baru ditambahkan`);
    if (upd > 0) parts.push(`${upd} kelas diperbarui`);
    if (del > 0) parts.push(`${del} kelas dihapus`);
    const message = `Prodi ${prodi}: ${parts.join(", ")}.`;

    const severity = del > 0 && ins === 0 ? "warning" : "success";

    // Deactivate any existing active event of the same type for this prodi
    const rows = await ctx.db
      .query("update_events")
      .withIndex("by_prodi", (q) => q.eq("prodi", prodi))
      .collect();
    const existingActive = rows.find((e) => e.type === args.type && e.active);
    if (existingActive) {
      await ctx.db.patch(existingActive._id, { active: false });
    }

    // Insert fresh event with accurate timestamp
    await ctx.db.insert("update_events", {
      prodi,
      type: args.type,
      title,
      message,
      severity,
      dismissed_by: [],
      active: true,
      inserted: ins,
      updated: upd,
      deleted: del,
    });
  },
});
