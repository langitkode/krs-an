import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { logAudit } from "./audit";
import { requireAdmin, normalizeDayOfWeek } from "./lib";
import { internal } from "./_generated/api";
import { rateLimit } from "./rateLimitConfig";

// checkAdmin used to be defined here (and duplicated in users.ts). It is now
// requireAdmin in ./lib. Re-exported under the old name so existing importers
// (convex/ai.ts) keep working without a rename.
export { requireAdmin as checkAdmin } from "./lib";

export const pingAdmin = query({
  args: {},
  handler: async () => {
    return "Architecture Core Online";
  },
});

// Master Schedule Operations
export const getPaginatedMasterCourses = query({
  args: {
    prodi: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.search) {
      let rows;
      if (args.prodi && args.prodi !== "all") {
        rows = await ctx.db
          .query("master_courses")
          .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
          .collect();
      } else {
        rows = await ctx.db.query("master_courses").collect();
      }

      const searchTerms = args.search
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const filtered = rows.filter((row) => {
        const code = row.code.toLowerCase();
        const name = row.name.toLowerCase();
        const className = row.class.toLowerCase();
        const lecturer = row.lecturer.toLowerCase();

        return searchTerms.every(
          (term) =>
            code.includes(term) ||
            name.includes(term) ||
            className.includes(term) ||
            lecturer.includes(term),
        );
      });

      const numItems = args.paginationOpts.numItems;
      const paginatedPage = filtered.slice(0, numItems);
      const isDone = numItems >= filtered.length;

      return {
        page: paginatedPage,
        isDone,
        continueCursor: isDone ? "" : String(numItems),
      };
    }

    if (args.prodi && args.prodi !== "all") {
      return await ctx.db
        .query("master_courses")
        .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
        .paginate(args.paginationOpts);
    }

    // Standard pagination without prodi filter
    return await ctx.db.query("master_courses").paginate(args.paginationOpts);
  },
});

export const getMasterCoursesCount = query({
  args: {
    prodi: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.search) {
      let rows;
      if (args.prodi && args.prodi !== "all") {
        rows = await ctx.db
          .query("master_courses")
          .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
          .collect();
      } else {
        rows = await ctx.db.query("master_courses").collect();
      }

      const searchTerms = args.search
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const filtered = rows.filter((row) => {
        const code = row.code.toLowerCase();
        const name = row.name.toLowerCase();
        const className = row.class.toLowerCase();
        const lecturer = row.lecturer.toLowerCase();

        return searchTerms.every(
          (term) =>
            code.includes(term) ||
            name.includes(term) ||
            className.includes(term) ||
            lecturer.includes(term),
        );
      });

      return filtered.length;
    }

    if (args.prodi && args.prodi !== "all") {
      const items = await ctx.db
        .query("master_courses")
        .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
        .collect();
      return items.length;
    }

    const items = await ctx.db.query("master_courses").collect();
    return items.length;
  },
});

export const listMasterCourses = query({
  args: { prodi: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.prodi) {
      return await ctx.db
        .query("master_courses")
        .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
        .collect();
    }
    return await ctx.db.query("master_courses").collect();
  },
});

export const bulkImportMaster = mutation({
  args: {
    courses: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
        sks: v.number(),
        prodi: v.string(),
        class: v.string(),
        lecturer: v.string(),
        room: v.string(),
        capacity: v.optional(v.number()),
        schedule: v.array(
          v.object({
            day: v.string(),
            start: v.string(),
            end: v.string(),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });

    const inputs = args.courses.map((c) => ({
      ...c,
      prodi: c.prodi.toUpperCase().trim().replace(/\.$/, ""),
      schedule: c.schedule.map((s) => ({
        ...s,
        day: normalizeDayOfWeek(s.day),
      })),
    }));
    const results = await Promise.all(
      inputs.map(async (course) => {
        // Check for existing course to prevent duplicates (basic check by code + class)
        // We use 'first()' instead of unique() because there might be bad data already.
        const existing = await ctx.db
          .query("master_courses")
          .withIndex("by_code", (q) => q.eq("code", course.code))
          .filter((q) => q.eq(q.field("class"), course.class))
          .first();

        if (existing) {
          // Update existing? Or Skip? For import, usually update or skip.
          // Let's UPDATE to ensure fresh data.
          await ctx.db.patch(existing._id, course);
          return { status: "updated", id: existing._id };
        } else {
          const id = await ctx.db.insert("master_courses", course);
          return { status: "inserted", id };
        }
      }),
    );

    // Track per-prodi counts for auto-event creation
    const prodiCounts: Record<string, { inserted: number; updated: number }> = {};
    for (let i = 0; i < results.length; i++) {
      const prodi = inputs[i].prodi;
      if (!prodiCounts[prodi]) prodiCounts[prodi] = { inserted: 0, updated: 0 };
      if (results[i].status === "inserted") prodiCounts[prodi].inserted++;
      else prodiCounts[prodi].updated++;
    }
    for (const [prodi, counts] of Object.entries(prodiCounts)) {
      const total = counts.inserted + counts.updated;
      await ctx.runMutation(internal.updateEvents.createAutoEvent, {
        prodi,
        type: "course_import",
        inserted: counts.inserted,
        updated: counts.updated,
        total,
      });
    }

    await logAudit(ctx, {
      user: user.tokenIdentifier,
      action: "bulk_import",
      details: `Imported/Updated ${results.length} courses`,
    });

    return { success: true, count: results.length };
  },
});

export const clearMasterData = mutation({
  args: { prodi: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    let items;
    if (args.prodi) {
      items = await ctx.db
        .query("master_courses")
        .withIndex("by_prodi", (q) => q.eq("prodi", args.prodi!))
        .collect();
    } else {
      items = await ctx.db.query("master_courses").collect();
    }

    // Batch delete
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));

    await logAudit(ctx, {
      user: user.tokenIdentifier,
      action: "clear_master_data",
      details: args.prodi ? `Cleared ${args.prodi}` : "Cleared ALL",
    });
  },
});

export const updateMasterCourse = mutation({
  args: {
    id: v.id("master_courses"),
    updates: v.object({
      code: v.optional(v.string()),
      name: v.optional(v.string()),
      sks: v.optional(v.number()),
      prodi: v.optional(v.string()),
      class: v.optional(v.string()),
      lecturer: v.optional(v.string()),
      room: v.optional(v.string()),
      capacity: v.optional(v.number()),
      schedule: v.optional(
        v.array(
          v.object({
            day: v.string(),
            start: v.string(),
            end: v.string(),
          }),
        ),
      ),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const updates = args.updates.schedule
      ? {
          ...args.updates,
          schedule: args.updates.schedule.map((s) => ({
            ...s,
            day: normalizeDayOfWeek(s.day),
          })),
        }
      : args.updates;
    await ctx.db.patch(args.id, updates);
  },
});

export const deleteMasterCourse = mutation({
  args: { id: v.id("master_courses") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    await ctx.db.delete(args.id);
  },
});

export const batchDeleteMaster = mutation({
  args: { ids: v.array(v.id("master_courses")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
    return { success: true, count: args.ids.length };
  },
});

/**
 * Reassign selected master_courses rows to a different prodi in place --
 * for fixing data imported under the wrong prodi (e.g. a faculty name
 * instead of the actual study program), without deleting and re-importing.
 */
export const moveMasterCoursesToProdi = mutation({
  args: { ids: v.array(v.id("master_courses")), prodi: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const normalized = args.prodi.toUpperCase().trim().replace(/\.$/, "");
    await Promise.all(
      args.ids.map((id) => ctx.db.patch(id, { prodi: normalized })),
    );
    return { success: true, count: args.ids.length };
  },
});

/**
 * Duplicate selected master_courses rows into a different prodi, leaving the
 * originals untouched -- for a course genuinely shared across prodi (e.g. a
 * general elective), where the same section needs to show up under more than
 * one prodi's catalog.
 */
export const copyMasterCoursesToProdi = mutation({
  args: { ids: v.array(v.id("master_courses")), prodi: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const normalized = args.prodi.toUpperCase().trim().replace(/\.$/, "");
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const toCopy = rows.filter((r): r is NonNullable<typeof r> => r !== null);
    await Promise.all(
      toCopy.map((row) => {
        const { _id, _creationTime, ...rest } = row;
        return ctx.db.insert("master_courses", {
          ...rest,
          prodi: normalized,
        });
      }),
    );
    return { success: true, count: toCopy.length };
  },
});

/**
 * General-purpose cleanup: reassign every master_courses row under one
 * source prodi to a different prodi based on which class-code prefix it
 * matches. Not specific to any one faculty/prodi split -- this replaced a
 * one-off mutation hardcoded to a single faculty and its two class prefixes,
 * once it became clear the same shape (a faculty-level prodi that actually
 * needs splitting by class prefix into its real study programs) would
 * recur. Mappings are
 * checked in order, first match wins; a class matching none of them is left
 * untouched and counted in `unmatched` so it can be moved by hand via the
 * Master Data move-to-prodi action instead. Run from the app while logged in
 * as admin -- requireAdmin needs a real Clerk session, which neither the CLI
 * nor the dashboard function runner carries.
 */
export const splitMasterCoursesByPrefix = mutation({
  args: {
    sourceProdi: v.string(),
    mappings: v.array(v.object({ prefix: v.string(), prodi: v.string() })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const sourceNormalized = args.sourceProdi
      .toUpperCase()
      .trim()
      .replace(/\.$/, "");
    const mappings = args.mappings
      .map((m) => ({
        prefix: m.prefix.trim().toUpperCase(),
        prodi: m.prodi.toUpperCase().trim().replace(/\.$/, ""),
      }))
      .filter((m) => m.prefix.length > 0 && m.prodi.length > 0);

    const rows = await ctx.db
      .query("master_courses")
      .withIndex("by_prodi", (q) => q.eq("prodi", sourceNormalized))
      .collect();

    const patches = rows.flatMap((row) => {
      const classUpper = row.class.trim().toUpperCase();
      const match = mappings.find((m) => classUpper.startsWith(m.prefix));
      return match ? [{ id: row._id, prodi: match.prodi }] : [];
    });

    await Promise.all(
      patches.map((p) => ctx.db.patch(p.id, { prodi: p.prodi })),
    );

    const perTarget: Record<string, number> = {};
    for (const p of patches) {
      perTarget[p.prodi] = (perTarget[p.prodi] || 0) + 1;
    }

    return {
      scanned: rows.length,
      moved: patches.length,
      unmatched: rows.length - patches.length,
      perTarget,
    };
  },
});

/**
 * Copy (upsert) master_courses rows from one prodi to one or more target
 * prodis based on class-code prefix matching. Source rows are never modified.
 *
 * Dedup: if a row with the same code + class already exists in the target
 * prodi it is patched (overwritten) rather than duplicated, so running this
 * operation twice is safe and idempotent.
 */
export const copyMasterCoursesByPrefix = mutation({
  args: {
    sourceProdi: v.string(),
    mappings: v.array(v.object({ prefix: v.string(), prodi: v.string() })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });

    const sourceNormalized = args.sourceProdi
      .toUpperCase()
      .trim()
      .replace(/\.$/, "");
    const mappings = args.mappings
      .map((m) => ({
        prefix: m.prefix.trim().toUpperCase(),
        prodi: m.prodi.toUpperCase().trim().replace(/\.$/, ""),
      }))
      .filter((m) => m.prefix.length > 0 && m.prodi.length > 0);

    const rows = await ctx.db
      .query("master_courses")
      .withIndex("by_prodi", (q) => q.eq("prodi", sourceNormalized))
      .collect();

    let inserted = 0;
    let overwritten = 0;
    const perTarget: Record<string, number> = {};

    await Promise.all(
      rows.map(async (row) => {
        const classUpper = row.class.trim().toUpperCase();
        const match = mappings.find((m) => classUpper.startsWith(m.prefix));
        if (!match) return;

        const { _id, _creationTime, ...rest } = row;
        const payload = { ...rest, prodi: match.prodi };

        // Upsert: check for an existing row with same code + class in the
        // target prodi. Patch if found, insert if not.
        const existing = await ctx.db
          .query("master_courses")
          .withIndex("by_code", (q) => q.eq("code", row.code))
          .filter((q) =>
            q.and(
              q.eq(q.field("class"), row.class),
              q.eq(q.field("prodi"), match.prodi),
            ),
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, payload);
          overwritten++;
        } else {
          await ctx.db.insert("master_courses", payload);
          inserted++;
        }

        perTarget[match.prodi] = (perTarget[match.prodi] || 0) + 1;
      }),
    );

    const unmatched = rows.length - inserted - overwritten;
    return {
      scanned: rows.length,
      copied: inserted + overwritten,
      inserted,
      overwritten,
      unmatched,
      perTarget,
    };
  },
});

/**
 * Delete master_courses rows from a source prodi whose class code starts with
 * any of the given prefixes. The target prodi in each mapping is ignored --
 * only the prefix column is used to match rows to delete.
 *
 * This is a permanent, irreversible operation. The caller is expected to
 * confirm before invoking.
 */
export const deleteMasterCoursesByPrefix = mutation({
  args: {
    sourceProdi: v.string(),
    prefixes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });

    const sourceNormalized = args.sourceProdi
      .toUpperCase()
      .trim()
      .replace(/\.$/, "");
    const normalizedPrefixes = args.prefixes
      .map((p) => p.trim().toUpperCase())
      .filter((p) => p.length > 0);

    if (normalizedPrefixes.length === 0) {
      return { scanned: 0, deleted: 0, unmatched: 0 };
    }

    const rows = await ctx.db
      .query("master_courses")
      .withIndex("by_prodi", (q) => q.eq("prodi", sourceNormalized))
      .collect();

    const toDelete = rows.filter((row) => {
      const classUpper = row.class.trim().toUpperCase();
      return normalizedPrefixes.some((p) => classUpper.startsWith(p));
    });

    await Promise.all(toDelete.map((row) => ctx.db.delete(row._id)));

    return {
      scanned: rows.length,
      deleted: toDelete.length,
      unmatched: rows.length - toDelete.length,
    };
  },
});

// Curriculum Operations
export const listCurriculum = query({
  args: { prodi: v.string(), semester: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (args.semester !== undefined) {
      return await ctx.db
        .query("curriculum")
        .withIndex("by_prodi_semester", (q) =>
          q.eq("prodi", args.prodi).eq("semester", args.semester!),
        )
        .collect();
    }
    // Prodi-only prefix match on the same by_prodi_semester index -- a
    // range index supports querying just its leading field, so this never
    // needed the full-table filter() scan it used to do.
    return await ctx.db
      .query("curriculum")
      .withIndex("by_prodi_semester", (q) => q.eq("prodi", args.prodi))
      .collect();
  },
});

export const addCurriculumItem = mutation({
  args: {
    prodi: v.string(),
    semester: v.number(),
    code: v.string(),
    name: v.string(),
    sks: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    return await ctx.db.insert("curriculum", args);
  },
});

/**
 * Add multiple curriculum rows at once, skipping any code already present
 * for this exact prodi+semester. addCurriculumItem never checked for
 * duplicates -- fine for pasted text where a repeated line is rare, but a
 * pick-from-repo picker makes "select the same course twice" an easy,
 * ordinary case that needs handling at the mutation level, not left to the
 * UI to avoid perfectly.
 */
export const addCurriculumItems = mutation({
  args: {
    prodi: v.string(),
    semester: v.number(),
    items: v.array(
      v.object({ code: v.string(), name: v.string(), sks: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const existing = await ctx.db
      .query("curriculum")
      .withIndex("by_prodi_semester", (q) =>
        q.eq("prodi", args.prodi).eq("semester", args.semester),
      )
      .collect();
    const existingCodes = new Set(existing.map((c) => c.code));
    const toInsert = args.items.filter((i) => !existingCodes.has(i.code));
    await Promise.all(
      toInsert.map((item) =>
        ctx.db.insert("curriculum", {
          ...item,
          prodi: args.prodi,
          semester: args.semester,
        }),
      ),
    );
    return {
      inserted: toInsert.length,
      skipped: args.items.length - toInsert.length,
    };
  },
});

/**
 * One-off cleanup: strip the deprecated `term` field from curriculum rows.
 *
 * Run once from the dashboard, then `term` can leave convex/schema.ts. Until
 * then the schema must keep it optional, because Convex rejects a push when a
 * stored document carries a field the schema does not declare.
 */
export const dropCurriculumTerm = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const rows = await ctx.db.query("curriculum").collect();
    const drifted = rows.filter((row) => row.term !== undefined);
    await Promise.all(
      drifted.map((row) => ctx.db.patch(row._id, { term: undefined })),
    );
    return { scanned: rows.length, cleaned: drifted.length };
  },
});

/**
 * One-off cleanup: re-normalize `master_courses.schedule[].day` on existing
 * rows through normalizeDayOfWeek. Import paths write canonical day values
 * now (bulkImportMaster, updateMasterCourse), but rows written before that
 * fix may still hold raw Indonesian/abbreviated strings. Run once from the
 * dashboard after deploying the write-path fix.
 */
export const normalizeMasterCourseDays = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const rows = await ctx.db.query("master_courses").collect();
    const patches = rows.flatMap((row) => {
      const normalized = row.schedule.map((s) => ({
        ...s,
        day: normalizeDayOfWeek(s.day),
      }));
      const drifted = normalized.some((s, i) => s.day !== row.schedule[i].day);
      return drifted ? [{ id: row._id, schedule: normalized }] : [];
    });
    await Promise.all(
      patches.map((p) => ctx.db.patch(p.id, { schedule: p.schedule })),
    );
    return { scanned: rows.length, changed: patches.length };
  },
});

export const removeCurriculumItem = mutation({
  args: { id: v.id("curriculum") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    await ctx.db.delete(args.id);
  },
});

export const batchDeleteCurriculum = mutation({
  args: { ids: v.array(v.id("curriculum")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
    return { success: true, deletedCount: args.ids.length };
  },
});

export const fixProdiFormatting = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const masterItems = await ctx.db.query("master_courses").collect();
    const curriculumItems = await ctx.db.query("curriculum").collect();

    const normalize = (prodi: string) =>
      prodi.toUpperCase().trim().replace(/\.$/, "");

    const masterPatches = masterItems.flatMap((item) => {
      const normalized = normalize(item.prodi);
      return item.prodi !== normalized
        ? [ctx.db.patch(item._id, { prodi: normalized })]
        : [];
    });
    const curriculumPatches = curriculumItems.flatMap((item) => {
      const normalized = normalize(item.prodi);
      return item.prodi !== normalized
        ? [ctx.db.patch(item._id, { prodi: normalized })]
        : [];
    });

    await Promise.all([...masterPatches, ...curriculumPatches]);

    return {
      success: true,
      fixedCount: masterPatches.length + curriculumPatches.length,
    };
  },
});

// Prodi Options: the source of truth for the prodi dropdowns in
// ScheduleConfig.tsx (student config form) and CurriculumTab.tsx (admin
// filter), which used to be two separately hardcoded arrays that had already
// drifted apart. Public read (matches listMasterCourses/listCurriculum --
// prodi names are not sensitive and the student form needs them
// unauthenticated); add/remove are admin-gated like every other write here.
export const listProdiOptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prodi_options").collect();
  },
});

export const addProdiOption = mutation({
  args: {
    name: v.string(),
    comingSoon: v.optional(v.boolean()),
    university: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const normalized = args.name.toUpperCase().trim().replace(/\.$/, "");
    const existing = await ctx.db
      .query("prodi_options")
      .withIndex("by_name", (q) => q.eq("name", normalized))
      .unique();
    if (existing) throw new Error("Prodi already exists.");
    return await ctx.db.insert("prodi_options", {
      name: normalized,
      comingSoon: args.comingSoon,
      university: args.university?.toUpperCase().trim() || undefined,
    });
  },
});

export const removeProdiOption = mutation({
  args: { id: v.id("prodi_options") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    await ctx.db.delete(args.id);
  },
});

/**
 * One-off seed: insert the prodi names that used to be hardcoded in
 * ScheduleConfig.tsx, skipping any that already exist. Run once from the
 * dashboard after deploying prodi_options -- not auto-run, since seeding is a
 * data decision, not something that should fire silently on every deploy.
 */
export const seedProdiOptions = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await rateLimit(ctx, { name: "adminMutations", throws: true });
    const seedNames: { name: string; comingSoon?: boolean }[] = [
      { name: "INFORMATIKA" },
      { name: "SISTEM INFORMASI" },
      { name: "TEKNIK INDUSTRI" },
      { name: "TEKNIK KIMIA" },
      { name: "TEKNIK PERTAMBANGAN" },
      { name: "TEKNIK ELEKTRO", comingSoon: true },
      { name: "FAKULTAS EKONOMI DAN BISNIS" },
    ];

    let inserted = 0;
    for (const seed of seedNames) {
      const existing = await ctx.db
        .query("prodi_options")
        .withIndex("by_name", (q) => q.eq("name", seed.name))
        .unique();
      if (!existing) {
        await ctx.db.insert("prodi_options", seed);
        inserted++;
      }
    }
    return { inserted };
  },
});
