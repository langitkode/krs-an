import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScheduleGrid } from "../ScheduleGrid";
import type { Plan, Course } from "@/types";
import { checkConflicts, resolveConflictsMinimally } from "../../lib/rules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { getProdiConfig } from "../../lib/prodi";
import { formatSchedule, normalizeDayOfWeek } from "@/lib/schedule-format";
import { useLanguage } from "../../context/LanguageContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import {
  MakerShell,
  type MakerFooterAction,
  type MakerRailStep,
} from "./MakerShell";

interface ScheduleViewerProps {
  plans: Plan[];
  currentPlanIndex: number;
  setCurrentPlanIndex: (index: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onSavePlan: (data: any) => void;
  isSaving: boolean;
  isManualEdit?: boolean;
  onUpdatePlan?: (updated: Course[]) => void;
  allPossibleCourses?: Course[];
  onAddSubject?: () => void;
  onManualEdit?: (courses: Course[]) => void;
  onExpand?: () => void;
  onShuffle?: () => void;
  planLimit: number;
  isGenerating?: boolean;
  prodi?: string;
  rail: MakerRailStep[];
}

export function ScheduleViewer({
  plans,
  currentPlanIndex,
  setCurrentPlanIndex,
  onBack,
  onSavePlan,
  isSaving,
  isManualEdit,
  onUpdatePlan,
  allPossibleCourses,
  onAddSubject,
  onManualEdit,
  onExpand,
  onShuffle,
  planLimit,
  isGenerating,
  prodi,
  rail,
}: ScheduleViewerProps) {
  const { t } = useLanguage();
  useDocumentTitle("page.title.view");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [isDragDrop, setIsDragDrop] = useState(false);
  const [draggedCode, setDraggedCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const prodiConfig = getProdiConfig(prodi || "");
  const currentPlan = plans[currentPlanIndex];

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) setIsDragDrop(true);
      else setIsDragDrop(false);
      document.documentElement.classList.toggle("krs-fullscreen", fs);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (!activeCode) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`inventory-${activeCode}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, isInventoryOpen ? 100 : 0);
    return () => clearTimeout(timer);
  }, [activeCode, isInventoryOpen]);
  const totalSKS = currentPlan.courses.reduce(
    (sum, c) => sum + (c.sks || 0),
    0,
  );

  const { valid, messages: conflictMessages } = checkConflicts(
    currentPlan.courses,
  );

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

  const uniqueCodes = useMemo(() => {
    return Array.from(new Set(allPossibleCourses?.map((ac) => ac.code) || []));
  }, [allPossibleCourses]);

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const handleUpdateCourse = (code: string, newVariation: Course) => {
    if (!onUpdatePlan) return;
    const nextCourses = currentPlan.courses.filter((c) => c.code !== code);
    nextCourses.push(newVariation);
    onUpdatePlan(nextCourses);
  };

  const handleReset = () => {
    if (!onUpdatePlan) return;
    onUpdatePlan([]);
    toast.info(t("toast.selections_cleared"));
  };

  const handleQuickFix = () => {
    if (!onUpdatePlan || !allPossibleCourses) return;

    // Touches only the courses actually in conflict, one swap at a time,
    // rather than rebuilding the whole plan from catalog order (see
    // docs/minimal-fix-conflicts-plan.md for why the old greedy rebuild was
    // silently changing courses that had no conflict at all).
    const { courses: fixedCourses, resolved, unresolvedPairs } =
      resolveConflictsMinimally(currentPlan.courses, groupedVariations);

    onUpdatePlan(fixedCourses);

    if (resolved) {
      toast.success(t("toast.quick_fix"));
    } else {
      const names = Array.from(
        new Set(unresolvedPairs.flat().map((c) => `${c.name} (${c.class})`)),
      ).join(", ");
      toast.warning(
        t("toast.quick_fix_partial", { count: unresolvedPairs.length, names }),
      );
    }
  };

  const renderInventory = () => (
    <div className="divide-y divide-border/80 text-caption">
      {uniqueCodes.map((code) => {
        const variations = groupedVariations[code] || [];
        const c = currentPlan.courses.find((cp) => cp.code === code);
        const isConflicted = c
          ? conflictMessages.some(
              (m) => m.includes(c.name) && m.includes(c.class),
            )
          : false;

        if (!c) {
          const sampleCourse = variations[0];
          return (
            <div
              key={code}
              id={`inventory-${code}`}
              draggable={isManualEdit && isDragDrop}
              className={`p-4 bg-muted/50 border-l-4 transition-all hover:bg-accent/50 ${
                activeCode === code ? "border-l-primary bg-accent" : "border-l-border"
              } ${isManualEdit && isDragDrop ? "cursor-grab active:cursor-grabbing" : ""}`}
              onDragStart={() => {
                if (!isManualEdit) return;
                setDraggedCode(code);
              }}
              onDragEnd={() => isManualEdit && setDraggedCode(null)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-caps font-mono text-muted-foreground uppercase">
                  {code}
                </span>
                <Badge
                  variant="outline"
                  className="text-grid-meta h-3.5 px-0.5 border-border text-muted-foreground rounded-[2px] tracking-tighter"
                >
                  UNSELECTED
                </Badge>
              </div>
              <h4 className="font-bold text-muted-foreground text-caption line-clamp-2 mb-3">
                {sampleCourse?.name || "Unknown Course"}
              </h4>
              <Select
                onValueChange={(value) => {
                  const variation = variations.find((v) => v.id === value);
                  if (variation) handleUpdateCourse(code, variation);
                }}
              >
                <SelectTrigger className="w-full h-8 border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary rounded-control bg-card">
                  <SelectValue placeholder="+" />
                </SelectTrigger>
                <SelectContent>
                  {variations.map((v) => (
                    <SelectItem
                      key={v.id}
                      value={v.id}
                      textValue={
                        prodiConfig.isCourseCentric
                          ? `${formatSchedule(v.schedule)} @ ${v.room || "TBA"}`
                          : `Class ${v.class} | ${v.lecturer} | ${formatSchedule(v.schedule)}`
                      }
                      className="rounded-control px-3 py-2 cursor-pointer focus:bg-muted"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-caption text-foreground">
                          {prodiConfig.isCourseCentric
                            ? `${formatSchedule(v.schedule)} @ ${v.room || "TBA"}`
                            : `Class ${v.class}`}
                        </span>
                        {!prodiConfig.isCourseCentric && (
                          <span className="text-muted-foreground text-caption font-medium italic">
                            {v.lecturer}
                          </span>
                        )}
                        <span
                          className={`text-primary text-grid font-mono font-bold mt-0.5 ${prodiConfig.isCourseCentric ? "text-muted-foreground" : ""}`}
                        >
                          {prodiConfig.isCourseCentric
                            ? `Class ${v.class}`
                            : formatSchedule(v.schedule)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div
            key={code}
            id={`inventory-${code}`}
            draggable={isManualEdit && isDragDrop}
            className={`p-4 transition-colors group flex flex-col gap-2 ${
              isConflicted
                ? "bg-destructive/10"
                : activeCode === code
                  ? "bg-accent"
                  : "hover:bg-muted/50"
            } ${isManualEdit && isDragDrop ? "cursor-grab active:cursor-grabbing" : ""}`}
            onDragStart={() => {
              if (!isManualEdit) return;
              setDraggedCode(code);
            }}
            onDragEnd={() => isManualEdit && setDraggedCode(null)}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-caption font-mono text-muted-foreground uppercase font-bold">
                    {c.code}
                  </span>
                  {isConflicted && (
                    <Badge
                      variant="destructive"
                      className="text-grid h-3.5 px-1.5 font-bold"
                    >
                      CONFLICT
                    </Badge>
                  )}
                </div>
                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-caption line-clamp-2">
                  {c.name}
                </h4>
                {!prodiConfig.isCourseCentric && (
                  <p className="text-caption font-medium text-muted-foreground mt-1 truncate italic">
                    {c.lecturer || "No Lecturer"}
                  </p>
                )}
                {/* Class + schedule shown as plain text regardless of mode --
                    this used to only appear inside the isManualEdit Select,
                    so a Susun Cepat (quick build, non-manual) result never
                    showed which class or what time a course actually was. */}
                <p className="text-caption font-mono font-medium text-muted-foreground mt-1 truncate">
                  {prodiConfig.isCourseCentric
                    ? `${formatSchedule(c.schedule)} @ ${c.room || "TBA"}`
                    : `Kelas ${c.class} | ${formatSchedule(c.schedule)}`}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-grid h-4 px-1.5 font-mono border-border text-muted-foreground bg-card shrink-0 ml-3 font-bold"
              >
                {c.sks} SKS
              </Badge>
            </div>

            {isManualEdit && (
              <div className="pt-1 mt-1 border-t border-border/50">
                <Select
                  value={c.id}
                  onValueChange={(value) => {
                    if (value === "remove") {
                      if (onUpdatePlan) {
                        const nextCourses = currentPlan.courses.filter(
                          (curr: any) => curr.code !== c.code,
                        );
                        onUpdatePlan(nextCourses);
                        toast.success(t("toast.course_removed_code", { code: c.code }));
                      }
                      return;
                    }
                    const variation = variations.find((v) => v.id === value);
                    if (variation) handleUpdateCourse(c.code, variation);
                  }}
                >
                  <SelectTrigger className="h-7 px-3 border-border bg-card hover:bg-accent rounded-control w-full min-w-[100px]">
                    <span className="truncate w-full text-left block">
                      {prodiConfig.isCourseCentric
                        ? `${formatSchedule(c.schedule)} @ ${c.room || "TBA"}`
                        : `Class ${c.class} | ${c.lecturer} | ${formatSchedule(c.schedule)}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="remove"
                      className="rounded-control px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive font-bold text-caption"
                    >
                      <div className="flex items-center gap-2">
                        <span>Minify / Remove Selection</span>
                      </div>
                    </SelectItem>
                    {variations.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        textValue={
                          prodiConfig.isCourseCentric
                            ? `${formatSchedule(v.schedule)} @ ${v.room || "TBA"}`
                            : `Class ${v.class} | ${v.lecturer} | ${formatSchedule(v.schedule)}`
                        }
                        className="rounded-control px-3 py-2 cursor-pointer focus:bg-muted"
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-caption text-foreground">
                              {prodiConfig.isCourseCentric
                                ? `${formatSchedule(v.schedule)} @ ${v.room || "TBA"}`
                                : `Class ${v.class}`}
                            </span>
                            {!prodiConfig.isCourseCentric && (
                              <span className="text-muted-foreground text-caption font-medium">
                                {v.lecturer}
                              </span>
                            )}
                            <span
                              className={`text-primary text-grid font-mono font-bold mt-0.5 ${prodiConfig.isCourseCentric ? "text-muted-foreground" : ""}`}
                            >
                              {prodiConfig.isCourseCentric
                                ? `Class ${v.class}`
                                : formatSchedule(v.schedule)}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const saveLabel = isSaving ? "Saving..." : isManualEdit ? "Commit" : "Save";
  const handleSave = () => {
    if (isManualEdit) onSavePlan(currentPlan.courses);
    else onSavePlan(currentPlan);
  };

  return (
    <MakerShell
      rail={rail}
      scrollBody={false}
      onBack={onBack}
      backLabel="Back"
      title={currentPlan.name}
      description={
        <span className="font-mono text-caps uppercase text-muted-foreground">
          {totalSKS} SKS
        </span>
      }
      extra={
        !isManualEdit &&
        plans.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex items-center gap-0.5 rounded-control bg-muted p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPlanIndex((prev) =>
                    prev > 0 ? prev - 1 : plans.length - 1,
                  )
                }
              >
                <Icon name="chevron-left" size={12} />
              </Button>
              <span className="px-1 font-mono text-caption font-bold">
                {currentPlanIndex + 1}/{plans.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPlanIndex((prev) =>
                    prev < plans.length - 1 ? prev + 1 : 0,
                  )
                }
              >
                <Icon name="chevron-right" size={12} />
              </Button>
            </div>
            <HelpTooltip titleKey="help.slider_title" descKey="help.slider_desc" />
          </div>
        )
      }
      footer={
        [
          !isManualEdit &&
            onShuffle && {
              key: "shuffle",
              label: "Shuffle",
              icon: "refresh",
              onClick: onShuffle,
              disabled: isGenerating,
              loading: isGenerating,
              tooltip: {
                titleKey: "help.shuffle_title",
                descKey: "help.shuffle_desc",
              },
            },
          !isManualEdit &&
            onExpand &&
            planLimit < 36 && {
              key: "expand",
              label: "Expand",
              icon: "sparkles",
              variant: "highlight",
              onClick: onExpand,
              disabled: isGenerating,
              loading: isGenerating,
              tooltip: {
                titleKey: "help.expand_title",
                descKey: "help.expand_desc",
              },
            },
          isManualEdit && {
            key: "add-subject",
            label: "Course",
            icon: "plus",
            onClick: onAddSubject || (() => {}),
          },
          isManualEdit && {
            key: "chess-toggle",
            label: "Drag",
            icon: "move",
            variant: isDragDrop ? "highlight" : undefined,
            onClick: () => {
              if (window.innerWidth < 1024) {
                toast.info(t("toast.desktop_only"));
                return;
              }
              setIsDragDrop(!isDragDrop);
              setIsInventoryOpen(false);
            },
          },
          isManualEdit && {
            key: "fix-conflicts",
            label: "Fix Conflicts",
            // Kept distinct from Save's "check" (both appear together in the
            // manual-edit footer): this is an AI-assisted action, same family
            // as Expand.
            icon: "sparkles",
            variant: "highlight",
            onClick: handleQuickFix,
            disabled: valid,
            tooltip: {
              titleKey: "help.quick_fix_title",
              descKey: "help.quick_fix_desc",
            },
          },
          isManualEdit && {
            key: "reset",
            label: "Reset",
            icon: "close",
            onClick: handleReset,
          },
          isManualEdit && {
            key: "fullscreen",
            label: isFullscreen ? "Exit" : "Fullscreen",
            icon: isFullscreen ? "minimize" : "maximize",
            variant: isFullscreen ? "highlight" : undefined,
            className: "hidden lg:flex",
            onClick: () => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            },
          },
          !isManualEdit && {
            key: "edit-manual",
            label: "Edit Manual",
            icon: "pencil",
            onClick: () => setShowManualConfirm(true),
          },
          {
            key: "save",
            label: saveLabel,
            icon: "check",
            onClick: handleSave,
            disabled: isSaving || (isManualEdit && !valid),
            loading: isSaving,
          },
        ].filter(Boolean) as MakerFooterAction[]
      }
    >
      <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
        <DialogContent size="md" padded={false}>
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="text-body flex items-center justify-between pr-8">
              <div className="flex items-center gap-2">
                <span>Daftar Mata Kuliah</span>
                <Badge className="border-transparent bg-primary/10 px-2 text-caption text-primary">
                  {currentPlan.courses.length}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  handleSave();
                  setIsInventoryOpen(false);
                }}
                disabled={isSaving || (isManualEdit && !valid)}
              >
                <Icon name="check" className={isSaving ? "animate-pulse" : ""} size={12} />
                {saveLabel}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">{renderInventory()}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualConfirm} onOpenChange={setShowManualConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Beralih ke Mode Manual?</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-muted-foreground px-6 pb-2">
            Edit manual berarti Anda akan kehilangan fitur Shuffle dan Expand, serta
            beralih ke mode plotter manual. Anda masih bisa menyimpan jadwal ini.
          </p>
          <div className="flex justify-end gap-2 px-6 pb-4">
            <Button variant="outline" onClick={() => setShowManualConfirm(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setShowManualConfirm(false);
                onManualEdit?.(currentPlan.courses);
              }}
            >
              Lanjutkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
          /*
            Flatten for ink by moving the tokens, not by naming utilities. The
            rules here used to target .bg-slate-50 / .shadow-xl / .rounded-2xl,
            none of which the app emits any more. Because @theme inline compiles
            bg-card to var(--card), re-pointing the token reaches every surface.
          */
          :root {
            --background: #fff;
            --card: #fff;
            --muted: #fff;
            --accent: #fff;
            --border: #cbd5e1;
            --foreground: #000;
          }
          .shadow-card, .shadow-overlay { box-shadow: none !important; }
        }
      `,
        }}
      />

      {isManualEdit && isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-card">
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {isManualEdit && isToolsOpen && (
              <div className="fixed bottom-20 right-[190px] z-50 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      toast.info(t("toast.desktop_only"));
                      return;
                    }
                    setIsDragDrop(!isDragDrop);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-caption font-bold shadow-overlay transition-all hover:opacity-90 ${
                    isDragDrop
                      ? "bg-highlight text-highlight-foreground"
                      : "bg-accent text-foreground"
                  }`}
                >
                  <Icon name="move" size={13} />
                  Drag
                </button>
                <button
                  onClick={onAddSubject || (() => {})}
                  className="flex items-center gap-1.5 rounded-full bg-accent text-foreground px-3 py-2 text-caption font-bold shadow-overlay hover:opacity-90 transition-all"
                >
                  <Icon name="plus" size={13} />
                  Course
                </button>
                <button
                  onClick={handleQuickFix}
                  disabled={valid}
                  className="flex items-center gap-1.5 rounded-full bg-accent text-foreground px-3 py-2 text-caption font-bold shadow-overlay hover:opacity-90 transition-all disabled:opacity-40"
                >
                  <Icon name="sparkles" size={13} />
                  Fix
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-full bg-accent text-foreground px-3 py-2 text-caption font-bold shadow-overlay hover:opacity-90 transition-all"
                >
                  <Icon name="close" size={13} />
                  Reset
                </button>
              </div>
            )}
            <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2">
              {isManualEdit && (
                <button
                  onClick={() => setIsToolsOpen((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2.5 text-caption font-bold shadow-overlay transition-all hover:opacity-90 ${
                    isToolsOpen
                      ? "bg-accent text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Icon name="grid" size={14} />
                  Tools
                </button>
              )}
              <button
                onClick={() => document.exitFullscreen()}
                className="flex items-center gap-1.5 rounded-full bg-background/90 border border-border px-3 py-2 text-caption text-muted-foreground shadow-overlay hover:bg-accent transition-colors backdrop-blur-sm"
              >
                <Icon name="minimize" size={12} />
                Exit
              </button>
            </div>
            <ScheduleGrid
              courses={currentPlan.courses}
              isCourseCentric={prodiConfig.isCourseCentric}
              onCourseClick={(code) => {
                setActiveCode(code);
              }}
              isDragDrop={isDragDrop}
              draggedCode={draggedCode}
              allPossibleCourses={allPossibleCourses}
              currentPlanCourses={currentPlan.courses}
              onCourseDragStart={(code) => setDraggedCode(code)}
              onCourseDragEnd={() => setDraggedCode(null)}
              onDropCourse={(code, dayIdx, hoveredStart) => {
                const variations = groupedVariations[code] || [];
                const day = ["Mon","Tue","Wed","Thu","Fri","Sat"][dayIdx] as any;
                const dayVariations = variations.filter((v) =>
                  v.schedule.some((s) => normalizeDayOfWeek(s.day) === day),
                );
                const candidates = dayVariations.length > 0 ? dayVariations : variations;
                if (candidates.length === 0) {
                  toast.error("Tidak ada kelas tersedia");
                  setDraggedCode(null);
                  return;
                }
                const hoverMin = toMinutes(hoveredStart);
                const best = candidates.reduce((a, b) => {
                  const aMin = Math.min(...a.schedule.map((s) => toMinutes(s.start)));
                  const bMin = Math.min(...b.schedule.map((s) => toMinutes(s.start)));
                  return Math.abs(aMin - hoverMin) < Math.abs(bMin - hoverMin) ? a : b;
                });
                handleUpdateCourse(code, best);
                setDraggedCode(null);
              }}
            />
          </div>
          <div
            className="shrink-0 h-16 border-t border-border bg-muted/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-1"
            onWheel={(e) => {
              if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {uniqueCodes.map((code) => {
              const variations = groupedVariations[code] || [];
              const c = currentPlan.courses.find((cp) => cp.code === code);
              const isConflicted = c
                ? conflictMessages.some((m) => m.includes(c.name) && m.includes(c.class))
                : false;
              const sampleCourse = c || variations[0];
              if (!sampleCourse) return null;
              return (
                <div
                  key={code}
                  draggable={isDragDrop}
                  onDragStart={() => {
                    setDraggedCode(code);
                  }}
                  onDragEnd={() => setDraggedCode(null)}
                  onClick={() => setActiveCode(code)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-2.5 border text-grid transition-colors cursor-default ${
                    isConflicted
                      ? "border-destructive/40 bg-destructive/10"
                      : c
                        ? "border-l-primary border-border bg-card hover:bg-accent"
                        : "border-dashed border-border bg-muted/50"
                  } ${isDragDrop ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <span className={`font-bold whitespace-nowrap text-caption truncate max-w-[100px] ${isConflicted ? "text-destructive" : "text-foreground"}`}>
                    {sampleCourse?.name || code}
                  </span>
                  {c && (
                    <Badge variant="outline" className="h-3.5 px-1 rounded-[2px] border-transparent bg-muted text-grid-meta text-muted-foreground shrink-0">
                      {c.class}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="h-3.5 px-1 rounded-[2px] border-transparent bg-primary/10 text-primary text-grid-meta shrink-0">
                    {c ? c.sks : (sampleCourse?.sks || 0)} SKS
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        id="printable-area"
        className="flex lg:grid lg:grid-cols-[1.2fr_380px] gap-4 md:gap-8 items-stretch h-full overflow-hidden pb-4"
      >
        <div className="w-full bg-card p-1 rounded-panel md:p-2 md:rounded-panel border border-border overflow-auto custom-scrollbar flex flex-col flex-1">
          {/* Only below lg: the sidebar Course Inventory card (hidden below
              lg) is the single source for this list on larger screens, so
              showing this too there was the exact "identical redundant"
              duplication being fixed. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInventoryOpen(true)}
            className="no-print mb-1 w-full justify-center gap-2 text-caption lg:hidden"
          >
            <Icon name="list" size={14} />
            Daftar Mata Kuliah
            <Badge className="border-transparent bg-primary/10 px-1.5 text-caption text-primary">
              {currentPlan.courses.length}
            </Badge>
          </Button>
          <div className="flex-1 min-h-0">
            <ScheduleGrid
              courses={currentPlan.courses}
              isCourseCentric={prodiConfig.isCourseCentric}
              onCourseClick={(code) => {
                setActiveCode(code);
                if (window.innerWidth < 1024) setIsInventoryOpen(true);
              }}
              isDragDrop={isManualEdit ? isDragDrop : undefined}
              draggedCode={isManualEdit ? draggedCode : undefined}
              allPossibleCourses={isManualEdit ? allPossibleCourses : undefined}
              currentPlanCourses={isManualEdit ? currentPlan.courses : undefined}
              onCourseDragStart={isManualEdit ? (code) => setDraggedCode(code) : undefined}
              onCourseDragEnd={isManualEdit ? () => setDraggedCode(null) : undefined}
              onDropCourse={isManualEdit ? (code, dayIdx, hoveredStart) => {
                const variations = groupedVariations[code] || [];
                const day = ["Mon","Tue","Wed","Thu","Fri","Sat"][dayIdx] as any;
                const dayVariations = variations.filter((v) =>
                  v.schedule.some((s) => normalizeDayOfWeek(s.day) === day),
                );
                const candidates = dayVariations.length > 0 ? dayVariations : variations;
                if (candidates.length === 0) {
                  toast.error("Tidak ada kelas tersedia");
                  setDraggedCode(null);
                  return;
                }
                const hoverMin = toMinutes(hoveredStart);
                const best = candidates.reduce((a, b) => {
                  const aMin = Math.min(...a.schedule.map((s) => toMinutes(s.start)));
                  const bMin = Math.min(...b.schedule.map((s) => toMinutes(s.start)));
                  return Math.abs(aMin - hoverMin) < Math.abs(bMin - hoverMin) ? a : b;
                });
                handleUpdateCourse(code, best);
                setDraggedCode(null);
                setIsInventoryOpen(false);
              } : undefined}
            />
          </div>
        </div>

        <div className="hidden lg:flex w-full shrink-0 flex-col h-full min-h-0">
          <Card className="border-border shadow-card overflow-hidden rounded-card flex flex-col bg-card h-full">
            <CardHeader className="bg-muted py-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-caption flex items-center gap-2">
                <span>Course Inventory</span>
                <Badge
                  variant="secondary"
                  className="border-transparent bg-primary/10 px-2 py-0.5 text-primary"
                >
                  {currentPlan.courses.length}
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast.success(t("viewer.print_prepare"));
                  setTimeout(() => window.print(), 50);
                }}
                className="h-7 px-2 font-mono text-caps uppercase"
              >
                <Icon name="printer" className="mr-1" size={12} />
                {t("viewer.print_btn")}
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              {renderInventory()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MakerShell>
  );
}
