import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Plus,
  PlusCircle,
  Trash,
  ChevronLeft,
  Brain,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/types";

interface ScheduleSelectorProps {
  courses: Course[];
  selectedCodes: string[];
  lockedCourses: Record<string, string>;
  sessionProfile: { maxSks: number };
  toggleCourse: (code: string) => void;
  setLockedCourses: (updater: (prev: any) => any) => void;
  handleDeleteCourse: (e: React.MouseEvent, id: string) => void;
  onAddSubject: () => void;
  onGenerate: (tokenized?: boolean) => void;
  onBack?: () => void;
  isGenerating?: boolean;
}

export function ScheduleSelector({
  courses,
  selectedCodes,
  lockedCourses,
  sessionProfile,
  toggleCourse,
  setLockedCourses,
  handleDeleteCourse,
  onAddSubject,
  onGenerate,
  onBack,
  isGenerating,
}: ScheduleSelectorProps) {
  const grouped = courses.reduce(
    (acc, c) => {
      acc[c.code] = acc[c.code] || [];
      acc[c.code].push(c);
      return acc;
    },
    {} as Record<string, Course[]>,
  );

  const totalSelectedSks = Object.entries(grouped)
    .filter(([code]) => selectedCodes.includes(code))
    .reduce((sum, [code, variations]) => {
      const lockedId = lockedCourses[code];
      const course = lockedId
        ? variations.find((v) => v.id === lockedId)
        : variations[0];
      return sum + (course?.sks || 0);
    }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="w-10 h-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-700 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="space-y-1 text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              Curate Your Semester
            </h2>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <Badge
                variant="outline"
                className={`px-3 py-1 font-mono text-xs ${
                  totalSelectedSks > sessionProfile.maxSks
                    ? "border-red-200 text-red-700 bg-red-50"
                    : "border-blue-100 text-blue-700 bg-blue-50"
                }`}
              >
                {totalSelectedSks} / {sessionProfile.maxSks} SKS
              </Badge>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                |
              </span>
              <p className="text-xs text-slate-500 hidden md:block">
                {selectedCodes.length} Subjects Selected
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={onAddSubject}
            className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-700 h-11 rounded-xl"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Subject
          </Button>
          <Button
            onClick={() => onGenerate(false)}
            disabled={selectedCodes.length === 0 || isGenerating}
            className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white h-11 px-8 rounded-xl font-display font-bold shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Brain
              className={`w-4 h-4 mr-2 ${isGenerating ? "animate-pulse" : ""}`}
            />
            {isGenerating ? "Planning..." : "Generate Plans (12)"}
          </Button>
        </div>
      </div>

      {/* Course List Cards */}
      <div className="grid gap-4">
        {Object.entries(grouped).map(([code, variations]) => {
          const isSelected = selectedCodes.includes(code);
          const lockedId = lockedCourses[code];
          const activeCourse = lockedId
            ? variations.find((v) => v.id === lockedId)
            : variations[0];

          if (!activeCourse) return null;

          return (
            <div
              key={code}
              className={`group relative overflow-hidden transition-all duration-300 rounded-2xl border-2 ${
                isSelected
                  ? "bg-white border-slate-200 shadow-sm"
                  : "bg-slate-50 border-slate-100 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="p-5 flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Selection Checkbox Area */}
                <div
                  onClick={() => toggleCourse(code)}
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "bg-white text-slate-300 hover:text-slate-400 border border-slate-200"
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Plus className="w-6 h-6" />
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {code}
                    </span>
                    <h3
                      className={`font-bold font-display truncate ${
                        isSelected ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {activeCourse.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span>{activeCourse.sks} SKS</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>{variations.length} Class Options</span>
                  </div>
                </div>

                {/* Section Selector (Only visible if selected) */}
                {isSelected && (
                  <div className="w-full md:w-72 shrink-0 animate-in fade-in slide-in-from-right-4">
                    <Select
                      value={lockedId || "any"}
                      onValueChange={(val) => {
                        setLockedCourses((prev: any) => {
                          const newLocked = { ...prev };
                          if (val === "any") {
                            delete newLocked[code];
                          } else {
                            newLocked[code] = val;
                          }
                          return newLocked;
                        });
                      }}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white transition-colors text-xs font-mono">
                        <SelectValue placeholder="Optimization: ANY Class" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem
                          value="any"
                          className="font-bold text-blue-700"
                        >
                          Auto-Optimize (Any Class)
                        </SelectItem>
                        {variations.map((v) => (
                          <SelectItem
                            key={v.id}
                            value={v.id}
                            className="text-xs"
                          >
                            <span className="font-bold mr-2">
                              Class {v.class}
                            </span>
                            <span className="text-slate-500">
                              {v.lecturer.split(",")[0]}
                            </span>
                            <span className="ml-auto text-slate-400 font-mono text-[10px] pl-2">
                              {v.schedule[0]?.day} {v.schedule[0]?.start}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Actions */}
                {isSelected && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={(e) => handleDeleteCourse(e, activeCourse.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-20 opacity-50">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
            No subjects loaded. Add from Master Catalog.
          </p>
        </div>
      )}
    </div>
  );
}
