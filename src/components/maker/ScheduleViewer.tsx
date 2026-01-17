import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Bookmark, Sparkles } from "lucide-react";
import { ScheduleGrid } from "../ScheduleGrid";
import { PlanAnalysis } from "../PlanAnalysis";
import type { Plan } from "@/types";

interface ScheduleViewerProps {
  plans: Plan[];
  currentPlanIndex: number;
  setCurrentPlanIndex: (index: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onSavePlan: (plan: Plan) => void;
  isSaving: boolean;
  onExpand?: () => void;
  isGenerating?: boolean;
  userData?: { credits: number };
}

export function ScheduleViewer({
  plans,
  currentPlanIndex,
  setCurrentPlanIndex,
  onBack,
  onSavePlan,
  isSaving,
  onExpand,
  isGenerating,
  userData,
}: ScheduleViewerProps) {
  const currentPlan = plans[currentPlanIndex];
  const totalSKS = currentPlan.courses.reduce(
    (sum, c) => sum + (c.sks || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          .bg-slate-50, .bg-slate-50/50, .bg-slate-50\/50 { background-color: white !important; }
          .shadow-xl, .shadow-sm, .shadow-2xl { box-shadow: none !important; }
          .border { border-color: #e2e8f0 !important; }
          .rounded-2xl { border-radius: 8px !important; }
        }
      `,
        }}
      />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <h2 className="text-2xl font-bold font-display text-slate-900">
                {currentPlan.name}
              </h2>
              <Badge
                variant="outline"
                className="border-blue-100 text-blue-700 bg-blue-50/50 px-2 font-mono text-[9px] uppercase tracking-widest"
              >
                PRECISE FIT
              </Badge>
            </div>
            <p className="text-slate-500 font-mono text-[9px] tracking-widest uppercase">
              PLAN {currentPlanIndex + 1} OF {plans.length} • {totalSKS} SKS
              TOTAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSavePlan(currentPlan)}
            disabled={isSaving}
            className="h-8 px-3 font-display text-[10px] font-bold border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm"
          >
            <Bookmark
              className={`w-3.5 h-3.5 mr-1.5 ${isSaving ? "animate-pulse" : ""}`}
            />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <div className="w-px h-8 bg-slate-200 mx-1" />
          <Button
            variant="ghost"
            disabled={currentPlanIndex === 0}
            onClick={() => setCurrentPlanIndex((prev: number) => prev - 1)}
            className="h-8 px-2 font-mono text-[10px] uppercase tracking-widest text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-500 border-x border-slate-200">
            {String(currentPlanIndex + 1).padStart(2, "0")}/
            {String(plans.length).padStart(2, "0")}
          </div>
          <Button
            variant="ghost"
            disabled={currentPlanIndex === plans.length - 1}
            onClick={() => setCurrentPlanIndex((prev: number) => prev + 1)}
            className="h-8 px-2 font-mono text-[10px] uppercase tracking-widest text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {plans.length < 24 && onExpand && (
            <>
              <div className="w-px h-8 bg-slate-200 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onExpand}
                disabled={isGenerating || (userData?.credits ?? 0) <= 0}
                className="h-8 px-3 font-display text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-all rounded-lg disabled:opacity-50"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? "animate-spin" : ""}`}
                />
                {isGenerating ? "Expanding..." : "Expand (+12)"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div id="printable-area" className="flex flex-col gap-6">
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xl shadow-blue-50/20">
          <ScheduleGrid courses={currentPlan.courses} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <PlanAnalysis plan={currentPlan} />

          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl flex flex-col">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-display flex items-center gap-2">
                <span>Course Inventory</span>
                <Badge
                  variant="secondary"
                  className="text-[9px] font-mono bg-white"
                >
                  {currentPlan.courses.length}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="no-print h-7 px-3 font-mono text-[9px] uppercase tracking-widest bg-white hover:bg-slate-50 border-slate-200"
                >
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[400px]">
              <div className="divide-y divide-slate-100 text-[11px]">
                {currentPlan.courses.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 hover:bg-slate-50/50 transition-colors group flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">
                        {c.code} • CLASS {c.class}
                      </span>
                      <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-xs leading-tight">
                        {c.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {c.lecturer}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[8px] h-4 px-1 font-mono border-slate-200 text-slate-600 bg-white shrink-0"
                    >
                      {c.sks} SKS
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
