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

    const existing = await ctx.db
      .query("update_events")
      .withIndex("by_prodi", (q) => q.eq("prodi", prodi))
      .collect();

    // Check if there is a currently active event of the same type to accumulate into
    const activeEvent = existing.find(
      (e) => e.type === args.type && e.active,
    );

    // Merge counts: active banner's existing counters + new counters
    const mergedIns = (activeEvent?.inserted ?? 0) + ins;
    const mergedUpd = (activeEvent?.updated ?? 0) + upd;
    const mergedDel = (activeEvent?.deleted ?? 0) + del;
    const mergedTot = mergedIns + mergedUpd + mergedDel;

    if (mergedTot === 0) return; // Nothing changed

    // Generate rich title based on modification type
    let title = "Jadwal kuliah diperbarui";
    if (mergedIns > 0 && mergedUpd === 0 && mergedDel === 0) {
      title = `${mergedIns} kelas baru ditambahkan`;
    } else if (mergedDel > 0 && mergedIns === 0 && mergedUpd === 0) {
      title = `${mergedDel} kelas dihapus`;
    } else if (mergedUpd > 0 && mergedIns === 0 && mergedDel === 0) {
      title = `${mergedUpd} kelas diperbarui`;
    } else if (mergedTot > 0) {
      title = `${mergedTot} perubahan jadwal kelas`;
    }

    // Generate descriptive details
    const parts: string[] = [];
    if (mergedIns > 0) parts.push(`${mergedIns} kelas baru ditambahkan`);
    if (mergedUpd > 0) parts.push(`${mergedUpd} kelas diperbarui`);
    if (mergedDel > 0) parts.push(`${mergedDel} kelas dihapus`);

    const message = `Prodi ${prodi}: ${parts.join(", ")}.`;
    const severity = mergedDel > 0 && mergedIns === 0 ? "warning" : "success";

    if (activeEvent) {
      // Update existing banner and clear dismissed list so users see the new counts
      await ctx.db.patch(activeEvent._id, {
        title,
        message,
        severity,
        inserted: mergedIns,
        updated: mergedUpd,
        deleted: mergedDel,
        dismissed_by: [], // Reset dismissal so the banner pops back up
      });
    } else {
      // Create new banner
      await ctx.db.insert("update_events", {
        prodi,
        type: args.type,
        title,
        message,
        severity,
        dismissed_by: [],
        active: true,
        inserted: mergedIns,
        updated: mergedUpd,
        deleted: mergedDel,
      });
    }
  },
});
