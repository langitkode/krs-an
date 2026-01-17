import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { generatePlans } from "@/lib/scheduler";
import type { Course, Plan, ArchivedPlan } from "@/types";
import { toast } from "sonner";

// Refactored Components
import { ScheduleConfig } from "./maker/ScheduleConfig";
import { ScheduleSelector } from "./maker/ScheduleSelector";
import { ScheduleViewer } from "./maker/ScheduleViewer";
import { ScheduleArchive } from "./maker/ScheduleArchive";
import { MasterCatalogDialog } from "./maker/MasterCatalogDialog";

interface ScheduleMakerProps {
  externalStep?: "config" | "select" | "view" | "archive";
  onStepChange?: (step: "config" | "select" | "view" | "archive") => void;
  userData?: {
    _id: string;
    credits: number;
    isAdmin: boolean;
  };
}

export function ScheduleMaker({
  externalStep,
  onStepChange,
  userData,
}: ScheduleMakerProps) {
  const [internalStep, setInternalStep] = useState<
    "config" | "select" | "view" | "archive"
  >("config");

  const step = externalStep || internalStep;
  const setStep = onStepChange || setInternalStep;
  const [sessionProfile, setSessionProfile] = useState<{
    university: string;
    prodi: string;
    semester: number;
    maxSks: number;
    useMaster: boolean;
  }>({
    university: "UPN_VETERAN_YOGYAKARTA",
    prodi: "INFORMATIKA",
    semester: 2,
    maxSks: 24,
    useMaster: true,
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [lockedCourses, setLockedCourses] = useState<Record<string, string>>(
    {},
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isMasterSearchOpen, setIsMasterSearchOpen] = useState(false);

  // Convex Queries
  const allMasterCourses = useQuery(api.admin.listMasterCourses, {
    prodi: sessionProfile.prodi,
  });
  const curriculum = useQuery(api.admin.listCurriculum, {
    prodi: sessionProfile.prodi,
    semester: sessionProfile.semester,
  });

  // Plan Archive Queries/Mutations
  const archived = useQuery((api as any).plans.listPlans) as
    | ArchivedPlan[]
    | undefined;
  const savePlanMutation = useMutation((api as any).plans.savePlan);
  const deletePlanMutation = useMutation((api as any).plans.deletePlan);
  const consumeTokenMutation = useMutation(api.users.generateServiceToken);

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handlers
  const handleSavePlan = async (plan: Plan) => {
    setIsSaving(true);
    try {
      await savePlanMutation({
        name: plan.name,
        data: JSON.stringify(plan),
      });
      toast.success("Plan archived successfully! View it in 'History' tab.");
    } catch (err: any) {
      toast.error("Failed to archive plan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArchived = async (planId: string) => {
    try {
      await deletePlanMutation({ planId });
      toast.success("Plan removed from archive.");
    } catch (err: any) {
      toast.error("Failed to delete plan: " + err.message);
    }
  };

  const handleImportArchived = (plan: Plan) => {
    setPlans([plan]);
    setCurrentPlanIndex(0);
    setStep("view");
    toast.info(`Loaded ${plan.name} from archive.`);
  };

  const handleGenerate = async (tokenized: boolean = false) => {
    if (tokenized) {
      if (!userData || userData.credits <= 0) {
        toast.error("Daily limit reached. Come back tomorrow!");
        return;
      }
      try {
        await consumeTokenMutation();
        toast.success("Consumed 1 token for +12 expansion.");
      } catch (err: any) {
        toast.error("Failed to consume token: " + err.message);
        return;
      }
    }

    setIsGenerating(true);
    try {
      const activeCourses = courses.filter((c) => {
        if (!selectedCodes.includes(c.code)) return false;
        const lockedId = lockedCourses[c.code];
        if (!lockedId || lockedId === "any") return true;
        return c.id === lockedId;
      });

      const currentPlanCount = plans.length;
      const limit = tokenized ? currentPlanCount + 12 : 12;
      const generated = generatePlans(activeCourses, selectedCodes, limit);

      if (generated.length === 0) {
        toast.error(
          "No valid schedules found. Try releasing some locked classes to allow more combinations.",
        );
        return;
      }

      if (tokenized) {
        // Append logic: Find plans that are NOT already in the set
        const existingComboKeys = new Set(
          plans.map((p) =>
            p.courses
              .map((c) => c.id)
              .sort()
              .join(","),
          ),
        );

        const newPlans = generated.filter((p) => {
          const key = p.courses
            .map((c) => c.id)
            .sort()
            .join(",");
          return !existingComboKeys.has(key);
        });

        if (newPlans.length === 0) {
          toast.info(
            "No new unique schedule combinations found with this configuration.",
          );
        } else {
          setPlans((prev) => [...prev, ...newPlans]);
          toast.success(
            `Discovered ${newPlans.length} new academic combinations!`,
          );
        }
      } else {
        setPlans(generated);
        setCurrentPlanIndex(0);
        setStep("view");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCourse = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleDeleteCourse = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    toast.success("Academic component removed.");
  };

  const handleAutoLoad = () => {
    if (!curriculum || !allMasterCourses) return;
    const mandatoryCodes = new Set(curriculum.map((c) => c.code));
    const filteredCourses = allMasterCourses.filter((c) =>
      mandatoryCodes.has(c.code),
    );

    const coursesWithIds = filteredCourses.map((c) => ({
      ...c,
      id: `${c.code}-${c.class}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    setCourses(coursesWithIds as any);
    setSelectedCodes(Array.from(mandatoryCodes));
    setStep("select");
    toast.success(
      `${mandatoryCodes.size} academic components loaded from curriculum.`,
    );
  };

  const handleAddMasterCourse = (masterCourse: any) => {
    const newCourse = {
      ...masterCourse,
      id: `${masterCourse.code}-${masterCourse.class}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setCourses((prev) => [...prev, newCourse]);
    if (!selectedCodes.includes(masterCourse.code)) {
      setSelectedCodes((prev) => [...prev, masterCourse.code]);
    }
    toast.success(`${masterCourse.name} added to session.`);
    setIsMasterSearchOpen(false);
  };

  return (
    <div className="pb-20 space-y-8">
      {/* Architect Flow Stepper (Only visible if architecting) */}
      {step !== "archive" && (
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-10" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 -z-10"
              style={{
                width:
                  step === "config" ? "0%" : step === "select" ? "50%" : "100%",
              }}
            />

            {[
              { id: "config", label: "Configure" },
              { id: "select", label: "Select" },
              { id: "view", label: "Visualize" },
            ].map((s, i) => {
              const isActive = step === s.id;
              const isPast =
                (step === "select" && i === 0) || (step === "view" && i <= 1);

              return (
                <div
                  key={s.id}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                  onClick={() => {
                    if (s.id === "config") setStep("config");
                    if (s.id === "select" && courses.length > 0)
                      setStep("select");
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all border-2 ${
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                        : isPast
                          ? "bg-blue-100 border-blue-600 text-blue-600"
                          : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-widest transition-colors ${isActive ? "text-blue-700 font-bold" : "text-slate-400"}`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        {step === "config" && (
          <ScheduleConfig
            sessionProfile={sessionProfile}
            setSessionProfile={setSessionProfile}
            onStart={handleAutoLoad}
          />
        )}

        {step === "select" && (
          <ScheduleSelector
            courses={courses}
            selectedCodes={selectedCodes}
            lockedCourses={lockedCourses}
            sessionProfile={sessionProfile}
            toggleCourse={toggleCourse}
            setLockedCourses={setLockedCourses}
            handleDeleteCourse={handleDeleteCourse}
            onAddSubject={() => setIsMasterSearchOpen(true)}
            onGenerate={handleGenerate}
            onBack={() => setStep("config")}
            isGenerating={isGenerating}
          />
        )}

        {step === "view" && plans.length > 0 && (
          <ScheduleViewer
            plans={plans}
            currentPlanIndex={currentPlanIndex}
            setCurrentPlanIndex={setCurrentPlanIndex}
            onBack={() => setStep("select")}
            onSavePlan={handleSavePlan}
            isSaving={isSaving}
            onExpand={() => handleGenerate(true)}
            isGenerating={isGenerating}
            userData={userData as any}
          />
        )}

        {step === "archive" && (
          <ScheduleArchive
            archived={archived}
            onImport={handleImportArchived}
            onDelete={handleDeleteArchived}
          />
        )}
      </div>

      <MasterCatalogDialog
        isOpen={isMasterSearchOpen}
        onOpenChange={setIsMasterSearchOpen}
        allMasterCourses={allMasterCourses}
        onAddCourse={handleAddMasterCourse}
      />
    </div>
  );
}
