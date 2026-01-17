import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Trash } from "lucide-react";
import type { ArchivedPlan, Plan } from "@/types";

interface ScheduleArchiveProps {
  archived: ArchivedPlan[] | undefined;
  onImport: (plan: Plan) => void;
  onDelete: (id: string) => void;
}

export function ScheduleArchive({
  archived,
  onImport,
  onDelete,
}: ScheduleArchiveProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archived?.map((plan) => (
          <Card
            key={plan._id}
            className="border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group"
          >
            <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display font-bold text-slate-900 line-clamp-1">
                  {plan.name}
                </CardTitle>
                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                  {new Date(plan.createdAt).toLocaleDateString()} •{" "}
                  {plan.data.courses.length} Subjects
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50"
                onClick={() => onDelete(plan._id)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                  <p className="text-[8px] font-mono text-blue-600 uppercase tracking-tight">
                    SKS Total
                  </p>
                  <p className="text-lg font-bold text-blue-700 leading-tight">
                    {plan.data.courses.reduce(
                      (sum, c) => sum + (c.sks || 0),
                      0,
                    )}
                  </p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  <p className="text-[8px] font-mono text-emerald-600 uppercase tracking-tight">
                    Status
                  </p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    Archived
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 h-10 rounded-xl font-display font-medium text-xs shadow-none group-hover:border-blue-200 group-hover:text-blue-700 transition-all"
                variant="outline"
                onClick={() => onImport(plan.data)}
              >
                Restore to Grid
              </Button>
            </CardContent>
          </Card>
        ))}
        {archived?.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
            <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
              <History className="w-6 h-6 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-slate-400">
                No archived plans yet
              </p>
              <p className="text-xs text-slate-400">
                Save your favorite architectures to view them here later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
