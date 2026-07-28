# Edit Archived Plan

## Approach

Safe **save-as-new**. Edit loads plan into plotter. Save creates new entry. Original untouched. No schema/mutation changes.

## UI Placement

Add small "Edit" text button between the top icon row (share/delete) and the info row (SKS/TIPE):

```
┌──────────────────────┐
│  Nama Plan     [✏️] │  ← title area (rename)
│  28 Mar | 5 MATKUL   │
│                [Edit]│  ← NEW small text button
├──────────────────────┤
│  SKS: 20    TIPE: AI │
├──────────────────────┤
│  [Muat ke Penampil]  │
└──────────────────────┘
```

"Edit" button: secondary, small, text-only, sits right-aligned on its own row or inline.

## Files

| File | Change |
|---|---|
| `src/hooks/maker/useScheduleSession.ts` | Add `handleEditArchived()` — loads plan into session, sets plotter mode, navigates to viewer |
| `src/components/maker/ScheduleArchive.tsx` | Add `onEdit` prop to `PlanCard` + `ScheduleArchive`. Small "Edit" button in card body. |
| `src/components/ScheduleMaker.tsx` | Create `handleEditArchived` callback → `session.handleEditArchived(plan)`. Pass to `ScheduleArchive`. |
| `src/context/LanguageContext.tsx` | Add `"archive.edit": "Edit"`. |

## handleEditArchived logic

```ts
handleEditArchived(plan: ArchivedPlan) => {
  const planCourses = plan.data.courses;
  const codes = [...new Set(planCourses.map(c => c.code))];
  const locked: Record<string, string[]> = {};
  for (const c of planCourses) {
    if (!locked[c.code]) locked[c.code] = [];
    locked[c.code].push(c.id);
  }

  // Clear stale session, load plan data
  setCourses(planCourses);
  setSelectedCodes(codes);
  setLockedCourses(locked);
  setIsManualMode(true);
  setViewSource("archive");
  setStep("view");
}
```

Courses are locked to their exact class so plotter shows them pre-filled. User can unlock/replace individual classes.

## What does NOT change

- `convex/` — no schema, no mutation
- `convex/plans.ts` — no updatePlan
- `usePlanArchive.ts` — no change
- `ScheduleViewer.tsx` — no change
- `handleSaveManualPlan` — no change
- Existing plan data — untouched
