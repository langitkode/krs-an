# Fix: Update Event Auto-Creation Skips on Repeated Imports

## Problem
`createAutoEvent` skips creating a new event if one already exists (active=true) for the same prodi+type. Second import generates no banner.

## Fix
In `convex/updateEvents.ts:createAutoEvent`:
1. Find existing active events for same prodi+type
2. Deactivate them (`active: false`)
3. Create new event with fresh message/counts

## File changed
`convex/updateEvents.ts` — `createAutoEvent` handler (lines 95-134)

## Before
```ts
if (alreadyActive) return;
```

## After
```ts
// Deactivate old events so repeated imports each get a fresh banner
await Promise.all(
  alreadyActive.map((e) => ctx.db.patch(e._id, { active: false })),
);
// Then continue to create new event
```
