# Chess Plot — Drag & Drop Schedule Builder

Toggle switch on viewer enabling drag-and-drop course placement onto the timetable grid. Native HTML5 Drag and Drop API — no libraries.

## Concept

```
Normal mode:          Drag & Drop mode:
┌──────────────────┐  ┌──────────────────┐
│ [Shuffle] [Save] │  │ [Course] [♝] [✓]│  ← toggle active
└──────────────────┘  └──────────────────┘

Inventory item becomes draggable. Dragging over grid shows all variation slots as dotted overlays. Drop places course.
```

## Grid positioning (existing, reused)

Constants in `src/components/ScheduleGrid.tsx`:
```
START_HOUR  = 7   (07:00)
END_HOUR    = 18  (18:00)
ROWS_PER_HOUR = 2  (30-min cells)
ROW_REM     = 1.75
DAYS        = ["Mon","Tue","Wed","Thu","Fri","Sat"]
```

Block position within a day column:
```
top    = (toMinutes(s.start) - START_HOUR*60) / 30 * ROW_REM   (rem)
height = (toMinutes(s.end) - toMinutes(s.start)) / 30 * ROW_REM (rem)
left   = 1px
right  = 1px
```

Day column CSS grid indices: time col = 1, Mon = 2, Tue = 3 ... Sat = 7.

## Overlay layer

When drag is active, render a separate positioned div per variation of the dragged course code:

```
┌──────────────────────────────┐
│        MON     TUE     WED   │
│ 07:00  ┌──┐                  │
│ 07:30  │  │  ┌──┐            │  ← dotted = available variation slot
│ 08:00  └──┘  │  │            │
│ 08:30       │  │  ┌──┐      │
│ 09:00       └──┘  │xx│      │  ← red dotted = occupied slot (conflict)
│ 09:30            └──┘      │
└──────────────────────────────┘
```

Each overlay:
- `position: absolute` within the day column
- Same `top`/`height` as the actual block would be
- `border: 2px dashed var(--accent)` for free slots
- `border: 2px dashed var(--destructive)` `background: hsl(var(--destructive)/0.08)` for occupied
- `pointer-events: none` (visual only — drop is handled by column-level drag-over)
- Only rendered when `draggedCode !== null`

## Mouse position to grid cell

Compute hovered day+time from mouse coords during `onDragOver`:

```
gridRect  = gridEl.getBoundingClientRect()
fontRem   = parseFloat(getComputedStyle(document.documentElement).fontSize)
colWidth  = (gridRect.width - 60) / 6              // time col = 60px

dayIdx    = Math.floor((e.clientX - gridRect.left - 60) / colWidth)
dayIdx    = clamp(dayIdx, 0, 5)

yOffset   = (e.clientY - gridRect.top) / (fontRem * ROW_REM)
slotIdx   = Math.floor(yOffset)                      // which 30-min row
hours     = START_HOUR + Math.floor(slotIdx / 2)
minutes   = (slotIdx % 2) * 30
hoveredStart = `${pad(hours)}:${pad(minutes)}`
```

## Variation matching on drop

When user drops on the grid:

1. Extract `code` from `dataTransfer`
2. Get all variations: `groupedVariations[code]`
3. Filter variations that have a schedule on `DAYS[dayIdx]`
4. Among those, find the variation whose `s.start` is closest to `hoveredStart`
5. If no variation on that day, find closest across all days
6. If no variation at all → toast "Tidak ada kelas tersedia"

Once variation is selected, call `handleUpdateCourse(code, variation)` (existing function).

## Occupied slot detection

A grid slot `(day, start, end)` is occupied if `currentPlan.courses` has any course whose schedule overlaps that slot on that day. Use existing `checkConflicts` logic or inline overlap check:

```
twoSlotsOverlap(a, b) =>
  a.day === b.day &&
  toMinutes(a.start) < toMinutes(b.end) &&
  toMinutes(b.start) < toMinutes(a.end)
```

## State

```ts
// in ScheduleViewer
const [isDragDrop, setIsDragDrop] = useState(false);
const [draggedCode, setDraggedCode] = useState<string | null>(null);
```

`draggedCode` is set on `onDragStart` from inventory, cleared on `onDragEnd` or `onDrop`.

## Props changes

### `ScheduleViewer.tsx`

No new props. All state is internal.

### `ScheduleGrid.tsx`

```ts
export function ScheduleGrid({
  courses,
  isCourseCentric,
  onCourseClick,
  isDragDrop,           // NEW
  draggedCode,          // NEW
  allPossibleCourses,   // NEW — for groupedVariations access
  onDropCourse,         // NEW — (code: string) => void
  currentPlanCourses,   // NEW — for occupied slot detection
}: {
  courses: Course[];
  isCourseCentric?: boolean;
  onCourseClick?: (code: string) => void;
  isDragDrop?: boolean;
  draggedCode?: string | null;
  allPossibleCourses?: Course[];
  onDropCourse?: (code: string, day: DayOfWeek, start: string) => void;
  currentPlanCourses?: Course[];
})
```

## UI: Toggle placement

Viewer footer action, between "Course" and "Fix Conflicts":

```ts
isManualEdit && {
  key: "chess-toggle",
  label: isDragDrop ? "Drag Drop" : "Drag & Drop",
  icon: isDragDrop ? "close" : "move",
  variant: isDragDrop ? "highlight" : undefined,
  onClick: () => setIsDragDrop(!isDragDrop),
},
```

Only shown when `isManualEdit` is true.

## Mobile

Toggle hidden on mobile (`<lg`). Agenda view has no grid geometry for drop targeting.
Add `className="hidden lg:flex"` to the toggle button.

Alternatively: keep toggle but disable it with tooltip "Hanya tersedia di layar besar" (only available on large screens).

## Files changed

| File | Change |
|---|---|
| `src/components/maker/ScheduleViewer.tsx` | Add `isDragDrop`, `draggedCode` state. Toggle in footer. Drag handlers on inventory items. Pass new props to ScheduleGrid. |
| `src/components/ScheduleGrid.tsx` | Accept drag-drop props. Render overlay layer during drag. Handle dragover/drop events on day columns. |

No changes to `convex/`, `types/`, `hooks/`, or `lib/`.

## Edge cases

- **Drop on self**: dropping a course on its own current slot → no-op
- **Drop on same code different slot**: replace with variation matching new slot
- **Drop on occupied slot by different code**: overlay is red, drop still allowed (user explicitly overrides)
- **No variation matches**: toast and no-op
- **Toggle off during drag**: `onDragEnd` fires naturally, state cleans up
- **Multiple courses same code in plan**: only one can be placed at a time (code is unique in `currentPlan.courses`)
- **Rapid toggle**: toggle is simple boolean, no side effects beyond clearing drag state

## Future considerations

- **Snap guidance**: show a horizontal line at the nearest 30-min boundary while dragging
- **Multi-day courses**: one course with schedule spanning multiple days shows overlays on each day
- **Touch support**: use Pointer Events polyfill or long-press to drag on mobile
