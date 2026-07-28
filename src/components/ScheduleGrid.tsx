import { Badge } from "@/components/ui/badge";
import type { Course, DayOfWeek, TimeSlot } from "../types";
import { checkConflicts } from "../lib/rules";
import {
  normalizeDayOfWeek,
  DAY_LABEL_ID,
  DAY_LABEL_ID_SHORT,
} from "../lib/schedule-format";
import { useMemo, useRef } from "react";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const START_HOUR = 7;
const END_HOUR = 18; // 6 PM
const ROWS_PER_HOUR = 2; // 30 min slots

/**
 * Height of one 30-minute row, in rem.
 *
 * This value was written out three times: the grid track definition and the
 * two expressions computing a block's `top` and `height`. All three must agree
 * or blocks land at the wrong time, and nothing would catch the drift, so it
 * is one constant. The track is a fixed size, which is what keeps the absolute
 * positioning honest: content cannot stretch a row.
 */
const ROW_REM = 1.75;

const slotIsOnDay = (slot: TimeSlot, day: DayOfWeek) =>
  normalizeDayOfWeek(slot.day) === day;

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function ScheduleGrid({
  courses,
  isCourseCentric,
  onCourseClick,
  isDragDrop,
  draggedCode,
  allPossibleCourses,
  currentPlanCourses,
  onDropCourse,
  onCourseDragStart,
  onCourseDragEnd,
}: {
  courses: Course[];
  isCourseCentric?: boolean;
  onCourseClick?: (code: string) => void;
  isDragDrop?: boolean;
  draggedCode?: string | null;
  allPossibleCourses?: Course[];
  currentPlanCourses?: Course[];
  onDropCourse?: (code: string, dayIdx: number, hoveredStart: string) => void;
  onCourseDragStart?: (code: string) => void;
  onCourseDragEnd?: () => void;
}) {
  const slots = (END_HOUR - START_HOUR) * ROWS_PER_HOUR;
  const { messages: conflictMessages } = checkConflicts(courses);

  // A course is conflicted if its name and class appear in any conflict message
  const isConflicted = (c: Course) =>
    conflictMessages.some((m) => m.includes(c.name) && m.includes(c.class));

  const gridRef = useRef<HTMLDivElement>(null);
  const groupedVariations = useMemo(() => {
    return (
      allPossibleCourses?.reduce(
        (acc, c) => {
          acc[c.code] = acc[c.code] || [];
          acc[c.code].push(c);
          return acc;
        },
        {} as Record<string, Course[]>,
      ) || {}
    );
  }, [allPossibleCourses]);

  const twoSlotsOverlap = (a: TimeSlot, b: TimeSlot) =>
    normalizeDayOfWeek(a.day) === normalizeDayOfWeek(b.day) &&
    toMinutes(a.start) < toMinutes(b.end) &&
    toMinutes(b.start) < toMinutes(a.end);

  /** Check if a given (day, start, end) conflicts with any current-plan course. */
  const isSlotOccupied = (day: string, start: string, end: string) =>
    currentPlanCourses?.some((pc) =>
      pc.schedule.some((ps) =>
        twoSlotsOverlap(ps, { day: day as DayOfWeek, start, end }),
      ),
    ) ?? false;

  return (
    <div className="flex h-full flex-col">
      {/*
        Below md the time grid is unusable: six columns at a readable width
        needs ~700px, which meant every phone got horizontal scrolling. Small
        screens get a day-grouped agenda instead, which is the same information
        in a shape that fits. Breakpoints alone cannot fix a grid that does not
        fit; it needs a different layout.
      */}
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar md:hidden">
        <Agenda
          courses={courses}
          isConflicted={isConflicted}
          isCourseCentric={isCourseCentric}
          onCourseClick={onCourseClick}
        />
      </div>

      <div
        ref={gridRef}
        className="hidden min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card custom-scrollbar md:block"
      >
        <div
          className="grid grid-cols-[60px_repeat(6,1fr)]"
          style={{ gridTemplateRows: `auto repeat(${slots}, ${ROW_REM}rem) 1fr` }}
        >
          {/* Header */}
          <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-muted p-1.5"></div>
          {DAYS.map((d, i) => (
            <div
              key={d}
              className="sticky top-0 z-20 border-b border-r border-border bg-muted p-1.5 text-center text-caps uppercase text-muted-foreground"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {DAY_LABEL_ID_SHORT[d]}
            </div>
          ))}

          {/* Time Column */}
          <div
            className="sticky left-0 z-20 grid bg-card"
            style={{
              gridTemplateRows: `repeat(${slots}, 1fr)`,
              gridColumn: 1,
              gridRow: `2 / span ${slots}`,
            }}
          >
            {Array.from({ length: slots }).map((_, i) => {
              const h = START_HOUR + Math.floor(i / 2);
              const m = i % 2 === 0 ? "00" : "30";
              return (
                <div
                  key={i}
                  style={{ height: `${ROW_REM}rem` }}
                  className="flex items-center justify-end border-b border-r border-border px-1 text-right font-mono text-grid text-muted-foreground"
                >
                  {m === "00" ? `${String(h).padStart(2, "0")}:00` : ""}
                </div>
              );
            })}
          </div>

          {/* Days Columns */}
          {DAYS.map((day, dayIdx) => {
            const fontRem = parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            );
            const handleDragOver = (e: React.DragEvent) => {
              if (!isDragDrop || !draggedCode) return;
              e.preventDefault();
              // Proportional scroll across full grid height
              const el = e.currentTarget as HTMLElement;
              const scrollContainer = el.closest(".overflow-auto") as HTMLElement | null;
              if (!scrollContainer) return;
              const rect = scrollContainer.getBoundingClientRect();
              const y = (e.clientY - rect.top) / rect.height; // 0..1
              // Scroll when in top 30% or bottom 30%
              const scrollZone = 0.3;
              const maxSpeed = 12;
              if (y < scrollZone) {
                const factor = 1 - y / scrollZone; // 1 at top edge, 0 at threshold
                scrollContainer.scrollTop -= maxSpeed * factor;
              } else if (y > 1 - scrollZone) {
                const factor = (y - (1 - scrollZone)) / scrollZone; // 1 at bottom edge, 0 at threshold
                scrollContainer.scrollTop += maxSpeed * factor;
              }
            };
            const handleDrop = (e: React.DragEvent) => {
              e.preventDefault();
              if (!draggedCode || !onDropCourse) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const yOffset =
                (e.clientY - rect.top) / (fontRem * ROW_REM);
              const slotIdx = Math.max(0, Math.floor(yOffset));
              const hours = START_HOUR + Math.floor(slotIdx / 2);
              const minutes = (slotIdx % 2) * 30;
              const hoveredStart = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
              onDropCourse(draggedCode, dayIdx, hoveredStart);
            };

            // Compute overlays for the dragged course code on this day
            const overlays = (() => {
              if (!isDragDrop || !draggedCode) return [];
              const variations = groupedVariations[draggedCode] || [];
              return variations.flatMap((v) =>
                v.schedule
                  .filter((s) => slotIsOnDay(s, day))
                  .map((s) => {
                    const startMin = toMinutes(s.start) - START_HOUR * 60;
                    const durationMin = toMinutes(s.end) - toMinutes(s.start);
                    const top = (startMin / 30) * ROW_REM;
                    const height = (durationMin / 30) * ROW_REM;
                    const occupied = isSlotOccupied(day, s.start, s.end);
                    return { top, height, occupied, key: `${v.id}-${s.start}` };
                  }),
              );
            })();

            return (
              <div
                key={day}
                className="relative"
                style={{
                  gridRow: `2 / span ${slots}`,
                  gridColumn: dayIdx + 2,
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Vertical border per column */}
                <div className="absolute inset-y-0 right-0 z-0 w-px bg-border"></div>

                {/* Grid lines */}
                <div
                  className="absolute inset-0 z-0 grid"
                  style={{ gridTemplateRows: `repeat(${slots}, 1fr)` }}
                >
                  {Array.from({ length: slots }).map((_, i) => (
                    <div
                      key={i}
                      style={{ height: `${ROW_REM}rem` }}
                      className={`border-b ${i % 2 === 1 ? "border-border/40" : "border-border"}`}
                    ></div>
                  ))}
                </div>

                {/* Drag overlays */}
                {overlays.map((o) => (
                  <div
                    key={o.key}
                    className={`absolute left-[2px] right-[2px] rounded-[3px] border-2 border-dashed pointer-events-none ${
                      o.occupied
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-primary/50 bg-primary/8"
                    }`}
                    style={{ top: `${o.top}rem`, height: `${o.height}rem` }}
                  />
                ))}

                {/* Courses */}
                {courses
                  .filter((c) => c.schedule.some((s) => slotIsOnDay(s, day)))
                  .map((c) =>
                    c.schedule
                      .filter((s) => slotIsOnDay(s, day))
                      .map((s, idx) => {
                        const startMin = toMinutes(s.start) - START_HOUR * 60;
                        const durationMin = toMinutes(s.end) - toMinutes(s.start);

                        const top = (startMin / 30) * ROW_REM;
                        const height = (durationMin / 30) * ROW_REM;
                        const conflicted = isConflicted(c);

                        return (
                          <div
                            key={`${c.id}-${idx}`}
                            draggable={isDragDrop}
                            onDragStart={() => onCourseDragStart?.(c.code)}
                            onDragEnd={() => onCourseDragEnd?.()}
                            className={`absolute left-[1px] right-[1px] flex flex-col justify-start overflow-hidden rounded-[3px] border border-l-2 p-1 text-grid transition-colors hover:z-40 ${
  conflicted
  ? "border-destructive/40 border-l-destructive bg-destructive/10"
  : "border-border border-l-primary bg-card hover:bg-accent"
  }${onCourseDragStart ? (isDragDrop ? " cursor-grab active:cursor-grabbing" : " cursor-pointer") : ""}`}
                            style={{ top: `${top}rem`, height: `${height}rem` }}
                          >
                            <div className="mb-0 flex items-start justify-between overflow-hidden">
                              <span
                                className={`mr-0.5 truncate font-mono ${conflicted ? "text-destructive" : "text-primary"}`}
                              >
                                {c.code}
                              </span>
                              <Badge
                                variant="outline"
                                className="h-3.5 shrink-0 rounded-[2px] border-transparent bg-muted px-1 text-grid-meta text-muted-foreground"
                              >
                                {c.class}
                              </Badge>
                            </div>
                            <span className="mt-0.5 line-clamp-1 font-bold text-foreground">
                              {c.name}
                            </span>
                            <div className="mt-auto flex items-center justify-between font-mono text-grid-meta font-bold text-muted-foreground">
                              <span className="truncate">
                                {isCourseCentric
                                  ? `RM: ${c.room || "TBA"}`
                                  : c.lecturer.split(",")[0]}
                              </span>
                            </div>
                          </div>
                        );
                      }),
                  )}
              </div>
            );
          })}
          {/* Filler row to fill remaining viewport height */}
          <div
            className="border-r border-border bg-card"
            style={{ gridColumn: `1 / span 7`, gridRow: slots + 2 }}
          ></div>
        </div>
      </div>
    </div>
  );
}

/** Mobile view: the same schedule grouped by day, in reading order. */
function Agenda({
  courses,
  isConflicted,
  isCourseCentric,
  onCourseClick,
}: {
  courses: Course[];
  isConflicted: (c: Course) => boolean;
  isCourseCentric?: boolean;
  onCourseClick?: (code: string) => void;
}) {
  const byDay = DAYS.map((day) => {
    const entries = courses
      .flatMap((course) =>
        course.schedule
          .filter((slot) => slotIsOnDay(slot, day))
          .map((slot) => ({ course, slot })),
      )
      .sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start));
    return { day, entries };
  }).filter((d) => d.entries.length > 0);

  if (byDay.length === 0) {
    return (
      <p className="py-12 text-center text-body text-muted-foreground">
        No classes scheduled.
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {byDay.map(({ day, entries }) => (
        <section key={day}>
          <h3 className="sticky top-0 z-10 mb-1.5 bg-background py-1 text-caps uppercase text-muted-foreground">
            {DAY_LABEL_ID[day]}
          </h3>
          <ul className="space-y-1.5">
            {entries.map(({ course, slot }, idx) => {
              const conflicted = isConflicted(course);
              return (
                <li
                  key={`${course.id}-${idx}`}
                  className={`flex gap-2.5 rounded-card border border-l-2 bg-card p-2.5 cursor-pointer ${
  conflicted
  ? "border-destructive/40 border-l-destructive"
  : "border-border border-l-primary"
  }`}
                  onClick={() => onCourseClick?.(course.code)}
                >
                  <div className="shrink-0 font-mono text-caption text-muted-foreground">
                    <div className="font-bold text-foreground">{slot.start}</div>
                    <div>{slot.end}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`font-mono text-caption font-bold ${conflicted ? "text-destructive" : "text-primary"}`}
                      >
                        {course.code}
                      </span>
                      <Badge variant="outline" className="h-4 px-1 text-caption">
                        {course.class}
                      </Badge>
                    </div>
                    <p className="truncate text-caption font-semibold text-foreground">
                      {course.name}
                    </p>
                    <p className="truncate font-mono text-caption text-muted-foreground">
                      {isCourseCentric
                        ? `RM: ${course.room || "TBA"}`
                        : course.lecturer.split(",")[0]}
                    </p>
                  </div>
                  {conflicted && (
                    <span className="shrink-0 self-center font-mono text-caption font-bold uppercase text-destructive">
                      Clash
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
