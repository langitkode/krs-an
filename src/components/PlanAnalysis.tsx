import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Plan } from "../types";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function PlanAnalysis({ plan }: { plan: Plan; apiKey?: string }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  const analyze = async () => {
    setLoading(true);
    try {
      const clerkToken = await getToken();
      const baseUrl = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/analyze-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ courses: plan.courses }),
      });

      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
      toast.success("Intelligence report generated.");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-100 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="p-5 pb-3 bg-slate-50/50 border-b border-slate-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <CardTitle className="text-sm font-display tracking-tight">
              Strategy Insights
            </CardTitle>
          </div>
          {!analysis && (
            <Button
              size="sm"
              onClick={analyze}
              disabled={loading}
              className="h-8 px-4 text-[10px] font-mono uppercase tracking-widest bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-2" />
              )}
              {loading ? "Processing" : "Generate Report"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {analysis ? (
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap animate-in fade-in duration-700 font-sans">
            {analysis}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full bg-slate-100 w-1/3 animate-[shimmer_2s_infinite]" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest leading-loose">
              Request an AI assessment to evaluate exhaustion risks, lunch
              breaks, and academic balance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
