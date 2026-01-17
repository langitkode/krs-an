import { Badge } from "@/components/ui/badge";
import type { Course, DayOfWeek } from "../types";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const START_HOUR = 7;
const END_HOUR = 18; // 6 PM
const ROWS_PER_HOUR = 2; // 30 min slots

export function ScheduleGrid({ courses }: { courses: Course[] }) {
  const slots = (END_HOUR - START_HOUR) * ROWS_PER_HOUR;

  return (
    <div className="bg-slate-50/50 rounded-[2rem] overflow-hidden border border-slate-200 shadow-inner p-2 h-full max-h-[75vh] flex flex-col">
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-2xl shadow-blue-50/50 flex-1 overflow-auto custom-scrollbar relative">
        <div
          className="grid grid-cols-6 min-w-[900px]"
          style={{ gridTemplateRows: `auto repeat(${slots}, 2.5rem)` }}
        >
          {/* Header */}
          <div className="p-4 border-b border-r bg-slate-50/60 sticky top-0 left-0 z-30 backdrop-blur-sm"></div>
          {DAYS.map((d) => (
            <div
              key={d}
              className="p-4 border-b border-r font-display font-black text-center bg-slate-50/60 text-slate-900 text-[10px] uppercase tracking-[0.2em] sticky top-0 z-20 backdrop-blur-sm"
            >
              {d === "Fri" ? (
                <span className="text-blue-700 underline underline-offset-4 decoration-2">
                  {d}
                </span>
              ) : (
                d
              )}
            </div>
          ))}

          {/* Time Column */}
          <div
            className="row-span-full grid sticky left-0 z-20 bg-white"
            style={{ gridTemplateRows: `repeat(${slots}, 1fr)` }}
          >
            {Array.from({ length: slots }).map((_, i) => {
              const h = START_HOUR + Math.floor(i / 2);
              const m = i % 2 === 0 ? "00" : "30";
              return (
                <div
                  key={i}
                  className="border-b border-r px-4 text-[9px] text-right text-slate-400 font-black font-mono flex items-center justify-end h-10 group hover:text-blue-600 transition-colors"
                >
                  {m === "00" ? `${String(h).padStart(2, "0")}:00` : ""}
                </div>
              );
            })}
          </div>

          {/* Days Columns */}
          {DAYS.map((day) => (
            <div
              key={day}
              className="relative group/col"
              style={{ gridRow: `2 / span ${slots}` }}
            >
              {/* Vertical border per column */}
              <div className="absolute inset-y-0 right-0 w-px bg-slate-100 z-0"></div>

              {/* Grid lines */}
              <div
                className="absolute inset-0 grid z-0"
                style={{ gridTemplateRows: `repeat(${slots}, 1fr)` }}
              >
                {Array.from({ length: slots }).map((_, i) => (
                  <div
                    key={i}
                    className={`border-b h-10 ${i % 2 === 1 ? "border-slate-50/30" : "border-slate-100/50"} group-hover/col:bg-blue-50/10 transition-colors`}
                  ></div>
                ))}
              </div>

              {/* Courses */}
              {courses
                .filter((c) =>
                  c.schedule.some((s) =>
                    s.day
                      .toLowerCase()
                      .startsWith(day.toLowerCase().slice(0, 3)),
                  ),
                )
                .map((c) => {
                  return c.schedule
                    .filter((s) =>
                      s.day
                        .toLowerCase()
                        .startsWith(day.toLowerCase().slice(0, 3)),
                    )
                    .map((s, idx) => {
                      const startMin =
                        (Number(s.start.split(":")[0]) - START_HOUR) * 60 +
                        Number(s.start.split(":")[1]);
                      const durationMin =
                        Number(s.end.split(":")[0]) * 60 +
                        Number(s.end.split(":")[1]) -
                        (Number(s.start.split(":")[0]) * 60 +
                          Number(s.start.split(":")[1]));

                      const top = (startMin / 30) * 2.5;
                      const height = (durationMin / 30) * 2.5;

                      return (
                        <div
                          key={`${c.id}-${idx}`}
                          className="absolute left-1 right-1 rounded-2xl p-3 text-[10px] border border-blue-100 shadow-lg flex flex-col justify-start overflow-hidden hover:z-40 transition-all bg-white hover:bg-blue-50/30 border-l-[6px] border-l-blue-700 group/card hover:scale-[1.02] active:scale-95 cursor-pointer"
                          style={{ top: `${top}rem`, height: `${height}rem` }}
                        >
                          <div className="flex justify-between items-start w-full relative z-10">
                            <span className="font-mono font-black text-blue-800 tracking-tighter text-[11px] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50">
                              {c.code}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black border-slate-200 bg-white shadow-sm ring-2 ring-slate-50"
                            >
                              {c.class}
                            </Badge>
                          </div>
                          <span className="font-display font-black text-slate-900 text-[12px] leading-none line-clamp-2 mt-2 tracking-tight group-hover/card:text-blue-900 transition-colors">
                            {c.name}
                          </span>
                          <div className="mt-auto flex items-center gap-2 pt-2 relative z-10">
                            <div className="h-4 w-4 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200">
                              <span className="text-[8px] font-bold text-slate-500">
                                🏢
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-[0.1em] truncate">
                              {c.room}
                            </span>
                          </div>
                          {/* Decorative blur blob */}
                          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-100/20 blur-2xl rounded-full group-hover/card:bg-blue-200/40 transition-all"></div>
                        </div>
                      );
                    });
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
