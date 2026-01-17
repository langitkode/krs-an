import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { useMutation as useReactQueryMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  Brain,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScheduleGrid } from "./ScheduleGrid";
import { generatePlans } from "@/lib/scheduler";
import type { Course, Plan } from "@/types";
import { PlanAnalysis } from "./PlanAnalysis";
import { toast } from "sonner";

export function ScheduleMaker() {
  const { getToken } = useAuth();
  const userData = useQuery(api.users.getCurrentUser);
  const generateServiceToken = useMutation(api.users.generateServiceToken);

  const [step, setStep] = useState<"upload" | "select" | "view">("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // AI Backend Mutation
  const aiMutation = useReactQueryMutation({
    mutationFn: async (file: File) => {
      // 1. Check Convex Credits
      const tokenResult = (await generateServiceToken()) as any;
      if (!tokenResult.allowed) throw new Error("Daily limit reached");

      // 2. Call FastAPI
      const clerkToken = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const baseUrl = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/parse-and-clean`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clerkToken}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Processing failed");
      return res.json();
    },
    onSuccess: (data: Course[]) => {
      setCourses(data);
      // Auto-select unique courses
      const uniqueCodes = Array.from(new Set(data.map((c) => c.code)));
      setSelectedCodes(uniqueCodes);
      setStep("select");
      toast.success("Schedule parsed successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to parse PDF");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) aiMutation.mutate(file);
  };

  const handleGenerate = () => {
    const generated = generatePlans(courses, selectedCodes);
    if (generated.length === 0) {
      toast.error(
        "No valid combinations found. Try selecting different classes.",
      );
      return;
    }
    setPlans(generated);
    setCurrentPlanIndex(0);
    setStep("view");
  };

  const toggleCourse = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  if (step === "upload") {
    return (
      <Card className="max-w-xl mx-auto border-2 border-dashed">
        <CardContent className="pt-10 pb-10 text-center">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-upload"
            onChange={handleFileUpload}
            disabled={aiMutation.isPending}
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer group flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              {aiMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <CardTitle className="mb-2">Upload your KRS PDF</CardTitle>
            <CardDescription>
              We'll use AI to extract class times and generate the best
              combinations for you.
            </CardDescription>
            <Badge variant="outline" className="mt-4">
              {userData?.credits ?? 5} generations left today
            </Badge>
          </label>
        </CardContent>
      </Card>
    );
  }

  if (step === "select") {
    const grouped = courses.reduce(
      (acc, c) => {
        acc[c.code] = acc[c.code] || [];
        acc[c.code].push(c);
        return acc;
      },
      {} as Record<string, Course[]>,
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Select Courses</h2>
            <p className="text-gray-500">
              Pick which courses you want to include in your plan.
            </p>
          </div>
          <Button onClick={handleGenerate} size="lg" className="gap-2">
            <Brain className="w-4 h-4" />
            Generate Plans
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(grouped).map(([code, options]) => (
            <Card
              key={code}
              className={`cursor-pointer transition-all ${selectedCodes.includes(code) ? "ring-2 ring-blue-500 bg-blue-50/30" : ""}`}
              onClick={() => toggleCourse(code)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">{code}</Badge>
                  {selectedCodes.includes(code) ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                  )}
                </div>
                <CardTitle className="text-lg">{options[0].name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-gray-500">
                  {options.length} classes available
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setStep("upload")}>
            Back to Upload
          </Button>
        </div>
      </div>
    );
  }

  if (step === "view" && plans.length > 0) {
    const currentPlan = plans[currentPlanIndex];
    const totalSKS = currentPlan.courses.reduce(
      (sum, c) => sum + (c.sks || 0),
      0,
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setStep("select")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{currentPlan.name}</h2>
              <Badge variant="outline">{totalSKS} SKS Total</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentPlanIndex === 0}
              onClick={() => setCurrentPlanIndex((prev) => prev - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              {currentPlanIndex + 1} of {plans.length}
            </span>
            <Button
              variant="outline"
              disabled={currentPlanIndex === plans.length - 1}
              onClick={() => setCurrentPlanIndex((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ScheduleGrid courses={currentPlan.courses} />
          </div>
          <div className="space-y-6">
            <PlanAnalysis
              plan={currentPlan}
              apiKey="NOT_NEEDED_BACKEND_HANDLES"
            />
            <Card>
              <CardHeader>
                <CardTitle>Course List</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  {currentPlan.courses.map((c, i) => (
                    <div key={i} className="p-4">
                      <p className="font-bold">
                        {c.code} - {c.class}
                      </p>
                      <p className="text-gray-600 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{c.lecturer}</p>
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

  return null;
}
