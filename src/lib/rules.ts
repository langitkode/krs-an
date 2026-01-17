import type { Course, TimeSlot, DayOfWeek } from "../types";

export const DAYS: DayOfWeek[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function isOverlapping(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;
  const start1 = parseTime(slot1.start);
  const end1 = parseTime(slot1.end);
  const start2 = parseTime(slot2.start);
  const end2 = parseTime(slot2.end);
  // Returns true if there is any overlap
  return Math.max(start1, start2) < Math.min(end1, end2);
}

export function checkConflicts(courses: Course[]): {
  valid: boolean;
  messages: string[];
} {
  const messages: string[] = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const c1 = courses[i];
      const c2 = courses[j];

      // Ignore if same course code (you can't take the same course twice usually, but let's assume valid selection logic handles that.
      // Actually, we should flag same-course duplicates too? No, usually that's valid if user selected them, but here we want VALID schedule.)
      // Actually, conflict check is strictly time check.

      let hasOverlap = false;
      for (const s1 of c1.schedule) {
        for (const s2 of c2.schedule) {
          if (isOverlapping(s1, s2)) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) break;
      }
      if (hasOverlap) {
        messages.push(
          `Conflict: ${c1.name} (${c1.class}) overlaps with ${c2.name} (${c2.class})`,
        );
      }
    }
  }
  return { valid: messages.length === 0, messages };
}
