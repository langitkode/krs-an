# In-App Update Banner

DB-driven notification banner on config screen showing course/curriculum updates.

## Table: `update_events`

```
update_events {
  prodi: string
  type: "course_import" | "curriculum_update" | "admin_notice"
  title: string         // Short ID label: "15 Kelas Baru"
  message: string       // Body ID: "Prodi INFORMATIKA mendapat 15 kelas baru"
  severity: "info" | "success" | "warning"
  dismissed_by: string[] // tokenIdentifier[] of users who dismissed
  active: boolean
}
index by_active ["active"]
index by_prodi ["prodi"]
```

## Backend: `convex/updateEvents.ts`

- `listActiveEvents(prodi?)` — query, returns active=true events, newest first
- `dismissEvent(eventId, tokenIdentifier?)` — mutation, adds token or fallback random id
- `createEvent` — admin mutation, inserts active event
- `createAutoEvent` — internalMutation, called after bulkImportMaster

## Auto-trigger

`bulkImportMaster` in `convex/admin.ts` tracks per-prodi insert counts.
If >0 inserts for a prodi, calls `ctx.runMutation(internal.updateEvents.createAutoEvent, {prodi, count})`.

## Component: `src/components/maker/UpdateBanner.tsx`

```
┌─────────────────────────────────────────────┐
│ [icon] INFORMATIKA — 15 kelas baru        [x]│
│ Data master diperbarui hari ini.             │
└─────────────────────────────────────────────┘
```

- Reads `listActiveEvents(prodi)` reactively
- Filters out events where user's token is in `dismissed_by`
- Anonymous: tracks dismiss via localStorage fallback
- Dismiss button calls `dismissEvent` mutation
- Returns null if no active events
- Stacked if multiple events exist

## Integration

Mounted in `ScheduleConfig.tsx` above the config grid columns.

## i18n

```
banner.new_courses = "{count} kelas baru ditambahkan"
banner.new_curriculum = "Kurikulum diperbarui"
banner.admin_notice = "Pengumuman"
banner.dismiss = "Tutup"
```

## Edge Cases

- Anonymous: dismiss via localStorage key `krs-banner-dismissed`
- No events: component returns null, zero layout cost
- Multiple events: stacked vertically, each dismissible independently
- Signed-in cross-device: dismiss stored server-side in `dismissed_by[]`
