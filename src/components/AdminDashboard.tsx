import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/clerk-react";
import { Textarea } from "@/components/ui/textarea";
import Papa from "papaparse";
import { Input } from "@/components/ui/input";
import {
  Copy,
  FileSpreadsheet,
  Wand2,
  Database,
  BookOpen,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export function AdminDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const masterCourses = useQuery(api.admin.listMasterCourses, {});
  const bulkImport = useMutation(api.admin.bulkImportMaster);
  const clearMaster = useMutation(api.admin.clearMasterData);

  // Curriculum Mutations
  const addCurriculum = useMutation(api.admin.addCurriculumItem);
  const removeCurriculum = useMutation(api.admin.removeCurriculumItem);

  const { getToken } = useAuth();

  const [isImporting, setIsImporting] = useState(false);
  const [isAiCleaning, setIsAiCleaning] = useState(false);
  const [rawText, setRawText] = useState("");
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [scraperMode, setScraperMode] = useState<"ai" | "manual">("manual");

  // Curriculum State
  const [curriculumProdi, setCurriculumProdi] = useState("INFORMATIKA");
  const [curriculumSemester, setCurriculumSemester] = useState(2);
  const [isCurriculumDialogOpen, setIsCurriculumDialogOpen] = useState(false);
  const [curriculumRawText, setCurriculumRawText] = useState("");
  const [importProdi, setImportProdi] = useState("INFORMATIKA");
  const [importSemester, setImportSemester] = useState(2);

  const curriculumData = useQuery(api.admin.listCurriculum, {
    prodi: curriculumProdi,
    semester: curriculumSemester,
  });

  const handleManualParse = async () => {
    if (!rawText.trim()) return;
    setIsAiCleaning(true);
    try {
      const blocks = rawText.trim().split(/\n\s*\n/);
      const data: any[] = [];

      blocks.forEach((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);
        if (lines.length < 1) return;

        const mainLine = lines[0];
        const lecturer = lines[1] || "-";
        const cols = mainLine.split("\t").map((c) => c.trim());
        if (cols.length < 6) return;

        let prodi, code, name, className, sks, scheduleRaw, room;

        if (cols.length >= 8) {
          prodi = cols[0] || "General";
          code = cols[1] || "N/A";
          name = cols[2] || "Untitled";
          className = cols[3] || "-";
          sks = parseInt(cols[4]) || 0;
          scheduleRaw = cols[6] || "";
          room = cols[7] || "-";
        } else {
          prodi = "General";
          code = cols[0] || "N/A";
          name = cols[1] || "Untitled";
          className = cols[2] || "-";
          sks = parseInt(cols[3]) || 0;
          scheduleRaw = cols[5] || "";
          room = cols[6] || "-";
        }

        const dayMap: Record<string, string> = {
          senin: "Mon",
          selasa: "Tue",
          rabu: "Wed",
          kamis: "Thu",
          jumat: "Fri",
          sabtu: "Sat",
          minggu: "Sun",
        };

        const scheduleParts = scheduleRaw
          ? scheduleRaw
              .split(";")
              .map((s: string) => {
                const match = s
                  .trim()
                  .match(/(\w+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
                if (match) {
                  let day = match[1].toLowerCase();
                  for (const [indo, eng] of Object.entries(dayMap)) {
                    if (day.startsWith(indo)) {
                      day = eng;
                      break;
                    }
                  }
                  return {
                    day:
                      day.length > 3
                        ? day.charAt(0).toUpperCase() +
                          day.slice(1, 3).toLowerCase()
                        : day,
                    start: match[2],
                    end: match[3],
                  };
                }
                return null;
              })
              .filter(Boolean)
          : [];

        data.push({
          code,
          name,
          sks,
          prodi,
          class: className,
          lecturer,
          room,
          schedule: scheduleParts,
        });
      });

      if (data.length === 0) throw new Error("No valid data found.");

      await bulkImport({ courses: data });
      toast.success(
        `Successfully parsed and deployed ${data.length} components.`,
      );
      setIsAiDialogOpen(false);
      setRawText("");
    } catch (err: any) {
      toast.error("Parsing failed: " + err.message);
    } finally {
      setIsAiCleaning(false);
    }
  };

  const handleCurriculumBatchImport = async () => {
    if (!curriculumRawText.trim()) return;
    setIsImporting(true);
    try {
      const lines = curriculumRawText.trim().split("\n");
      let count = 0;
      for (const line of lines) {
        const cols = line.split("\t").map((c) => c.trim());
        if (cols.length < 3) continue;

        await addCurriculum({
          prodi: importProdi,
          semester: importSemester,
          term: importSemester % 2 === 0 ? "Even" : "Odd",
          code: cols[0],
          name: cols[1],
          sks: parseInt(cols[2]) || 0,
        });
        count++;
      }
      toast.success(
        `Successfully added ${count} items to ${importProdi} Sem ${importSemester}`,
      );
      setIsCurriculumDialogOpen(false);
      setCurriculumRawText("");
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveCurriculum = async (id: any) => {
    try {
      await removeCurriculum({ id });
      toast.success("Item removed from curriculum");
    } catch (err) {
      toast.error("Failed to remove item");
    }
  };

  if (user === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-40 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest animate-pulse">
          Authenticating Architect...
        </p>
      </div>
    );
  }

  if (user === null || !user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-red-100 blur-2xl rounded-full opacity-20 animate-pulse" />
          <AlertCircle className="w-16 h-16 text-red-500 relative" />
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-display font-bold text-slate-900 italic">
            Access Denied
          </h1>
          <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
            Your identity is not recognized as a <strong>Core Architect</strong>
            . Access to university master data is restricted.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-display text-sm tracking-wide"
            onClick={() => (window.location.href = "/")}
          >
            Return to Planner
          </Button>

          {user?.tokenIdentifier && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Architect Identity Token
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-white rounded-lg border border-slate-100 break-all text-left">
                    <code className="text-[9px] text-blue-700 font-mono leading-tight">
                      {user.tokenIdentifier}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white"
                    onClick={() => {
                      navigator.clipboard.writeText(user.tokenIdentifier);
                      toast.success("Token copied to clipboard");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 text-center leading-normal">
                Use this token with the <code>makeAdmin</code> mutation in your
                developer console to gain access.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Basic validation
      if (!Array.isArray(data))
        throw new Error("JSON must be an array of courses");

      await bulkImport({ courses: data });
      toast.success(
        `Successfully deployed ${data.length} strategy components.`,
      );
    } catch (err: any) {
      toast.error("Deployment failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const formattedData = results.data.map((row: any) => {
            // Process schedule string: "Mon 07:00-09:00; Wed 07:00-09:00"
            const scheduleRaw = row.schedule || "";
            const scheduleParts = scheduleRaw
              .split(";")
              .map((s: string) => {
                const match = s
                  .trim()
                  .match(/(\w+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
                if (match) {
                  return { day: match[1], start: match[2], end: match[3] };
                }
                return null;
              })
              .filter(Boolean);

            return {
              code: row.code,
              name: row.name,
              sks: Number(row.sks),
              prodi: row.prodi,
              class: row.class,
              lecturer: row.lecturer,
              room: row.room,
              capacity: row.capacity ? Number(row.capacity) : undefined,
              schedule: scheduleParts,
            };
          });

          await bulkImport({ courses: formattedData as any });
          toast.success(
            `Successfully imported ${formattedData.length} records from CSV.`,
          );
        } catch (err: any) {
          toast.error("CSV Import failed: " + err.message);
        } finally {
          setIsImporting(false);
        }
      },
      error: (err) => {
        toast.error("CSV Parse failed: " + err.message);
        setIsImporting(false);
      },
    });
  };

  const handleAiCleanup = async () => {
    if (!rawText.trim()) return;
    setIsAiCleaning(true);
    try {
      const clerkToken = await getToken();
      const baseUrl = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/process-master-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) throw new Error("AI cleaning failed");
      const data = await res.json();

      await bulkImport({ courses: data });
      toast.success(
        `AI successfully cleaned and deployed ${data.length} components.`,
      );
      setIsAiDialogOpen(false);
      setRawText("");
    } catch (err: any) {
      toast.error("Cleanup failed: " + err.message);
    } finally {
      setIsAiCleaning(false);
    }
  };

  const handleClearMaster = async () => {
    if (!confirm("This will purge ALL core master data. Proceed?")) return;
    try {
      await clearMaster({});
      toast.success("Core data purged.");
    } catch (err: any) {
      toast.error("Cleanup failed.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Architectural Core
          </h1>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">
            Master Data Control Center
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="font-mono text-[9px] uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50 h-8"
            onClick={handleClearMaster}
          >
            <Trash2 className="w-3 h-3 mr-2" /> Purge Master
          </Button>
        </div>
      </div>

      <Tabs defaultValue="master" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger
            value="master"
            className="rounded-lg font-mono text-[9px] uppercase tracking-widest px-6"
          >
            <Database className="w-3 h-3 mr-2" /> Master Schedule
          </TabsTrigger>
          <TabsTrigger
            value="curriculum"
            className="rounded-lg font-mono text-[9px] uppercase tracking-widest px-6"
          >
            <BookOpen className="w-3 h-3 mr-2" /> Curriculum (1-8)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/30">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-display">
                    Master Data Repository
                  </CardTitle>
                  <CardDescription className="font-mono text-[9px] uppercase tracking-widest mt-0.5">
                    Global Component Database
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsAiDialogOpen(true)}
                    className="rounded-xl px-4 font-mono text-[9px] uppercase tracking-widest border-blue-200 text-blue-700 hover:bg-blue-50 h-8"
                  >
                    <Wand2 className="w-3 h-3 mr-2" />
                    AI Scraper
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="csv-import"
                      onChange={handleCsvImport}
                    />
                    <Label htmlFor="csv-import">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-xl px-4 font-mono text-[9px] uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer h-8"
                      >
                        <span>
                          {isImporting ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <FileSpreadsheet className="w-3 h-3 mr-2" />
                          )}
                          CSV
                        </span>
                      </Button>
                    </Label>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      id="master-import"
                      onChange={handleBulkImport}
                    />
                    <Label htmlFor="master-import">
                      <Button
                        asChild
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 font-mono text-[9px] uppercase tracking-widest cursor-pointer shadow-lg shadow-slate-100 h-8"
                      >
                        <span>
                          {isImporting ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <Upload className="w-3 h-3 mr-2" />
                          )}
                          JSON
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Course Name</th>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-left">Prodi</th>
                      <th className="px-4 py-3 text-left">SKS</th>
                      <th className="px-4 py-3 text-left">Lecturer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {masterCourses?.slice(0, 50).map((c: any) => (
                      <tr
                        key={c._id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-900">
                          {c.code}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{c.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {c.class}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">
                          {c.prodi}
                        </td>
                        <td className="px-4 py-2.5 font-mono">{c.sks}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px] overflow-hidden max-w-[150px] truncate">
                          {c.lecturer}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {masterCourses?.length === 0 && (
                  <div className="p-16 text-center text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em]">
                    No components found.
                  </div>
                )}
                {(masterCourses?.length ?? 0) > 50 && (
                  <div className="p-3 text-center bg-slate-50 text-[9px] font-mono text-slate-400">
                    Showing 50 of {masterCourses?.length} components.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/30">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex flex-col md:flex-row items-end gap-4 w-full xl:w-auto">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-display">
                      Curriculum Blueprint
                    </CardTitle>
                    <CardDescription className="font-mono text-[9px] uppercase tracking-widest mt-0.5">
                      Mandatory Course Mapping (Sem 1-8)
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-mono tracking-widest text-slate-500">
                        Prodi Filter
                      </Label>
                      <Input
                        value={curriculumProdi}
                        onChange={(e) =>
                          setCurriculumProdi(e.target.value.toUpperCase())
                        }
                        className="h-8 bg-white border-slate-200 rounded-lg text-xs min-w-[150px]"
                        placeholder="e.g. INFORMATIKA"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-mono tracking-widest text-slate-500">
                        Semester Filter
                      </Label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <button
                            key={s}
                            onClick={() => setCurriculumSemester(s)}
                            className={`w-7 h-7 rounded text-[9px] font-mono transition-all ${curriculumSemester === s ? "bg-white text-blue-700 shadow-sm font-bold" : "hover:bg-white/50 text-slate-500"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setIsCurriculumDialogOpen(true)}
                  className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 h-9 shadow-lg shadow-blue-100 font-display text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-2" />
                  Batch Import
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Course Name</th>
                      <th className="px-4 py-3 text-left">SKS</th>
                      <th className="px-4 py-3 text-left">Term</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {curriculumData?.map((c: any) => (
                      <tr
                        key={c._id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900 group-hover:text-blue-700">
                          {c.code}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{c.name}</td>
                        <td className="px-4 py-2.5 font-mono">{c.sks}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-wider ${c.term === "Odd" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}
                          >
                            {c.term}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCurriculum(c._id)}
                            className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {curriculumData?.length === 0 && (
                  <div className="p-16 text-center text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em]">
                    No curriculum data found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-4xl bg-white rounded-3xl p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-display font-bold text-slate-900 italic flex items-center gap-3">
                  <Wand2 className="w-6 h-6 text-blue-700" />
                  Intelligence Scraper
                </DialogTitle>
                <DialogDescription className="text-[11px] font-mono text-slate-400 uppercase tracking-widest pt-2">
                  Architect your database from raw terminal data or pasted
                  sheets.
                </DialogDescription>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <Button
                  variant={scraperMode === "manual" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setScraperMode("manual")}
                  className={`rounded-lg font-mono text-[9px] uppercase tracking-wider px-4 ${scraperMode === "manual" ? "bg-white shadow-sm" : ""}`}
                >
                  Manual Core
                </Button>
                <Button
                  variant={scraperMode === "ai" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setScraperMode("ai")}
                  className={`rounded-lg font-mono text-[9px] uppercase tracking-wider px-4 ${scraperMode === "ai" ? "bg-white shadow-sm" : ""}`}
                >
                  AI Architect
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="relative group">
              <Textarea
                value={rawText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRawText(e.target.value)
                }
                placeholder={
                  scraperMode === "manual"
                    ? "Paste spreadsheet rows here (Tab separated)...\nOrder: Prodi [TAB] Kode [TAB] Nama [TAB] Kelas [TAB] SKS [TAB] Jumlah [TAB] Jadwal [TAB] Ruang\n(Nama Dosen di baris baru setelah setiap data)"
                    : "Paste messy schedule text here... AI will analyze and structure it automatically."
                }
                className="min-h-[350px] bg-slate-50 border-none rounded-2xl p-6 font-mono text-xs leading-relaxed focus-visible:ring-blue-700 transition-all group-focus-within:bg-white group-focus-within:shadow-inner"
              />
              {scraperMode === "manual" && (
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const template =
                        "PRODI\tKODE\tNAMA\tKELAS\tSKS\tJUMLAH\tSENIN 07:00-09:00\tRUANG\nNAMA DOSEN";
                      navigator.clipboard.writeText(template);
                      toast.success("Structure template copied to clipboard");
                    }}
                    className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy Template
                  </Button>
                </div>
              )}
            </div>

            <div
              className={`p-5 rounded-2xl border transition-colors ${scraperMode === "manual" ? "bg-slate-50 border-slate-100" : "bg-blue-50/50 border-blue-50"}`}
            >
              <div className="flex gap-4 items-start">
                <AlertCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${scraperMode === "manual" ? "text-slate-400" : "text-blue-700"}`}
                />
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-tight text-slate-900">
                    {scraperMode === "manual"
                      ? "Deterministic Core Mode"
                      : "AI Intelligence Mode"}
                  </p>
                  <p
                    className={`text-[10px] leading-relaxed ${scraperMode === "manual" ? "text-slate-500" : "text-blue-900"}`}
                  >
                    {scraperMode === "manual"
                      ? "Directly maps columns from Tab-Separated values (Excel/CSV). Handles empty columns automatically. This method is 100% accurate if your format follows the template."
                      : "Uses Gemini AI to extract structured records from unstructured text. Best for messy portal copies. May require human verification after deployment."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setIsAiDialogOpen(false)}
              className="font-mono text-[10px] uppercase tracking-widest text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={
                scraperMode === "manual" ? handleManualParse : handleAiCleanup
              }
              disabled={isAiCleaning || !rawText.trim()}
              className={`${scraperMode === "manual" ? "bg-slate-900 shadow-slate-200" : "bg-blue-700 shadow-blue-100"} hover:opacity-90 text-white font-display font-medium px-8 rounded-xl shadow-lg min-w-[180px] transition-all`}
            >
              {isAiCleaning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {scraperMode === "manual" ? "Parsing..." : "Architecting..."}
                </>
              ) : (
                <>
                  {scraperMode === "manual"
                    ? "Execute Manual Sync"
                    : "Execute AI Deployment"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isCurriculumDialogOpen}
        onOpenChange={setIsCurriculumDialogOpen}
      >
        <DialogContent className="max-w-3xl bg-white rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-display font-bold text-slate-900 italic flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-700" />
                Curriculum Batch Importer
              </DialogTitle>
              <DialogDescription className="text-[11px] font-mono text-slate-400 uppercase tracking-widest pt-2">
                Define mandatory courses for a specific semester profile.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                  Target Prodi
                </Label>
                <Input
                  value={importProdi}
                  onChange={(e) => setImportProdi(e.target.value.toUpperCase())}
                  className="bg-slate-50 border-none rounded-xl h-10 text-sm"
                  placeholder="e.g. INFORMATIKA"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                  Target Semester
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={importSemester}
                  onChange={(e) => setImportSemester(parseInt(e.target.value))}
                  className="bg-slate-50 border-none rounded-xl h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono tracking-widest text-slate-400 italic">
                Course Data Block
              </Label>
              <div className="relative group">
                <Textarea
                  value={curriculumRawText}
                  onChange={(e) => setCurriculumRawText(e.target.value)}
                  placeholder="Paste here: Kode [TAB] Nama [TAB] SKS\nExample:\n123210082	Statistika	3"
                  className="min-h-[250px] bg-slate-50 border-none rounded-2xl p-6 font-mono text-xs leading-relaxed focus-visible:ring-blue-700 transition-all group-focus-within:bg-white group-focus-within:shadow-inner"
                />
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const template = "KODE\tNAMA MATKUL\tSKS";
                      navigator.clipboard.writeText(template);
                      toast.success("Curriculum template copied");
                    }}
                    className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy Format
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-700">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <p className="text-[10px] leading-relaxed">
                <strong>Important:</strong> Pasting items will add them to the
                selection. If you want to replace existing data, remove the
                entries from the table first. Total SKS should be verified after
                import.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setIsCurriculumDialogOpen(false)}
              className="font-mono text-[10px] uppercase tracking-widest text-slate-400"
            >
              Discard
            </Button>
            <Button
              onClick={handleCurriculumBatchImport}
              disabled={isImporting || !curriculumRawText.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white font-display font-medium px-8 rounded-xl shadow-lg shadow-blue-100 min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing Blueprint...
                </>
              ) : (
                "Sync to Blueprint"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
