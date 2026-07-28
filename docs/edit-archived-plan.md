# Implementation Plan: Plan Config Records, "Muat & Edit" & Stale/Orphan Resolution

## Goal
Attach lightweight config records (`prodi`, `semester`) when saving new plans so that clicking **"Muat & Edit"** populates all matching course sections from the master catalog into the Plotter inventory, while gracefully resolving orphaned, mismatched, or stale data between saved plans and the database.

---

## Handling Stale, Orphaned & Mismatched Plan Data

| Scenario | Issue | Resolution |
|---|---|---|
| **Orphaned / Removed Course in DB** | Course section saved in `plan.courses` no longer exists in `master_courses` DB table. | `handleEditArchived` merges `matchingMasterCourses` WITH `plan.courses` (deduplicating by `id`). The plan's snapshot courses are **always preserved**, guaranteeing no data loss or blank screens. |
| **New Class Sections Added to DB** | DB has added new sections (e.g., Class C) since the plan was created. | `allMasterCourses` lookup matches by course `code`. The new sections automatically appear in the Plotter inventory, allowing the user to swap to newly offered sections. |
| **Cross-Prodi / Shared Plans** | Plan originates from another prodi/university not in local `allMasterCourses`. | Snapshot `plan.courses` are ingested directly into `session.courses` and `lockedCourses`, making shared plans editable regardless of local DB state. |
| **Corrupt / Empty Plan Data** | `plan.courses` is empty or malformed (`data: null`). | `usePlanArchive` filters out unusable rows (`RawArchivedPlan` -> `ArchivedPlan`). `handleEditArchived` guards against empty arrays and displays a friendly toast. |

---

## Technical Flow

### 1. Ingest Config Metadata on Save
When saving a plan (`handleSaveManualPlan` in `useScheduleSession.ts`):
- Attach `prodi`: `sessionProfile.prodi || course.prodi`
- Attach `semester`: `sessionProfile.semester`
- Stored inside `plans.data` JSON string (~30 bytes, zero Convex schema changes needed).

### 2. Loading Plan into Plotter ("Muat & Edit")
When **"Muat & Edit"** is clicked on an archived plan:
- Extract course codes: `codes = [...new Set(plan.courses.map(c => c.code))]`.
- Extract locked active section IDs: `locked = { [c.code]: [c.id] }`.
- Find matching catalog sections: `matchingMaster = (allMasterCourses || []).filter(mc => codes.includes(mc.code))`.
- Merge catalog sections + snapshot plan courses: `session.courses = merge(matchingMaster, plan.courses)`.
- Set `selectedCodes = codes`, `lockedCourses = locked`.
- Navigate to Plotter view (`isManualMode = true`, `step = "view"`).
- `sessionProfile` remains untouched.

---

## What Does NOT Change

- `convex/` schema -- no schema migration, no mutation changes
- `convex/plans.ts` -- `savePlan` mutation signature unchanged (data is a JSON string, prodi/semester live inside it)
- `usePlanArchive.ts` -- no change
- `ScheduleViewer.tsx` -- no change
- Existing plan data -- untouched (legacy fallback covers them)
