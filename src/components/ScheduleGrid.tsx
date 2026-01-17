import type { Course, DayOfWeek } from "../types";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const START_HOUR = 7;
const END_HOUR = 18; // 6 PM
const ROWS_PER_HOUR = 2; // 30 min slots

export function ScheduleGrid({ courses }: { courses: Course[] }) {
  const slots = (END_HOUR - START_HOUR) * ROWS_PER_HOUR;

  return (
    <div
      className="grid grid-cols-6 border-l border-t bg-white"
      style={{ gridTemplateRows: `auto repeat(${slots}, 3rem)` }}
    >
      {/* Header */}
      <div className="p-2 border-b border-r bg-gray-50"></div>
      {DAYS.map((d) => (
        <div
          key={d}
          className="p-2 border-b border-r font-bold text-center bg-gray-50"
        >
          {d}
        </div>
      ))}

      {/* Time Column */}
      <div
        className="row-span-full grid"
        style={{ gridTemplateRows: `repeat(${slots}, 1fr)` }}
      >
        {Array.from({ length: slots }).map((_, i) => {
          const h = START_HOUR + Math.floor(i / 2);
          return (
            <div
              key={i}
              className="border-b border-r px-2 text-xs text-right text-gray-500 pt-1 -mt-px h-12"
            >
              {i % 2 === 0 ? `${h}:00` : ""}
            </div>
          );
        })}
      </div>

      {/* Days Columns */}
      {DAYS.map((day) => (
        <div
          key={day}
          className="relative border-r"
          style={{ gridRow: `2 / span ${slots}` }}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateRows: `repeat(${slots}, 1fr)` }}
          >
            {Array.from({ length: slots }).map((_, i) => (
              <div key={i} className="border-b h-12"></div>
            ))}
          </div>

          {/* Courses */}
          {courses
            .filter((c) => c.schedule.some((s) => s.day === day))
            .map((c) => {
              return c.schedule
                .filter((s) => s.day === day)
                .map((s, idx) => {
                  const startMin =
                    (Number(s.start.split(":")[0]) - START_HOUR) * 60 +
                    Number(s.start.split(":")[1]);
                  const durationMin =
                    Number(s.end.split(":")[0]) * 60 +
                    Number(s.end.split(":")[1]) -
                    (Number(s.start.split(":")[0]) * 60 +
                      Number(s.start.split(":")[1]));

                  const top = (startMin / 30) * 3;
                  const height = (durationMin / 30) * 3;

                  return (
                    <div
                      key={`${c.id}-${idx}`}
                      className="absolute left-1 right-1 rounded px-2 py-1 text-xs border shadow-sm flex flex-col justify-center overflow-hidden hover:z-10 transition-all bg-blue-100 border-blue-300 text-blue-900"
                      style={{ top: `${top}rem`, height: `${height}rem` }}
                    >
                      <strong className="truncate">{c.code}</strong>
                      <span className="truncate">{c.name}</span>
                      <span className="truncate">{c.room}</span>
                    </div>
                  );
                });
            })}
        </div>
      ))}
    </div>
  );
}
