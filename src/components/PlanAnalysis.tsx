import { useState } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
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
      toast.success("AI Analysis complete!");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-800 font-bold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-sm">AI Trade-off Analysis</CardTitle>
          </div>
          {!analysis && (
            <Button
              size="sm"
              onClick={analyze}
              disabled={loading}
              className="h-7 px-3 text-xs bg-blue-600 rounded-full"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Brain className="w-3 h-3 mr-1" />
              )}
              {loading ? "Thinking..." : "Analyze"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {analysis ? (
          <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap animate-in fade-in duration-500">
            {analysis}
          </div>
        ) : (
          <p className="text-xs text-blue-600/70">
            Click analyze to get AI insights on exam gaps, lunch breaks, and
            exhaustion risks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
