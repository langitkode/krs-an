import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

interface ScheduleConfigProps {
  sessionProfile: {
    university: string;
    prodi: string;
    semester: number;
    maxSks: number;
    useMaster: boolean;
  };
  setSessionProfile: (profile: any) => void;
  onStart: () => void;
}

export function ScheduleConfig({
  sessionProfile,
  setSessionProfile,
  onStart,
}: ScheduleConfigProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Context & Identity */}
        <div className="lg:col-span-5 space-y-8 py-4">
          <div className="space-y-4">
            <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/15 border-blue-200/50 px-3 py-1 rounded-full font-mono text-[10px] tracking-widest uppercase">
              Academic Year 2025/2026
            </Badge>
            <h2 className="text-5xl font-bold font-display text-slate-900 tracking-tight leading-[1.1]">
              Architect Your <br />
              <span className="text-blue-700">Semester.</span>
            </h2>
            <p className="text-slate-600 max-w-sm leading-relaxed text-base">
              Establish your academic parameters to initialize the intelligent
              scheduler for the upcoming term.
            </p>
          </div>

          <div className="relative overflow-hidden bg-slate-900 text-white py-2 rounded-2xl shadow-lg border border-slate-800">
            <div className="flex animate-marquee items-center gap-8 whitespace-nowrap">
              <div className="flex items-center gap-3 px-4">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  AI Optimization Engine Active
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700 mx-2" />
                <span className="text-[10px] font-mono text-slate-400">
                  Cross-referencing database... Achieve optimal academic
                  balance... Preventing scheduling conflicts...
                </span>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center gap-3 px-4">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  AI Optimization Engine Active
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700 mx-2" />
                <span className="text-[10px] font-mono text-slate-400">
                  Cross-referencing database... Achieve optimal academic
                  balance... Preventing scheduling conflicts...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The "Configuration" Card */}
        <div className="lg:col-span-7">
          <div className="bg-white p-8 sm:p-10 rounded-[32px] border border-slate-200 shadow-2xl shadow-blue-100/20 space-y-1 transition-all hover:shadow-blue-100/30">
            <div className="space-y-0.5">
              <h1 className="text-xl font-display font-bold text-slate-900 uppercase tracking-widest">
                Academic Configuration
              </h1>
              <div className="h-1 w-12 bg-blue-700 rounded-full" />
            </div>

            <div className="space-y-3">
              <div className="space-y-3">
                <Label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Institution / University
                </Label>
                <Select
                  value={sessionProfile.university}
                  onValueChange={(val) =>
                    setSessionProfile({ ...sessionProfile, university: val })
                  }
                >
                  <SelectTrigger className="bg-slate-50/50 border-slate-200 font-display text-sm h-12 rounded-xl focus:ring-blue-700/20">
                    <SelectValue placeholder="Select University" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="UPN_VETERAN_YOGYAKARTA">
                      <div className="flex items-center gap-2">
                        <img
                          src="/assets/univ/upnyk.webp"
                          alt="Logo"
                          className="w-4 h-4 rounded-sm object-contain"
                        />
                        <span>UPN "Veteran" Yogyakarta</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="UNY" disabled>
                      Univ. Negeri Yogyakarta (Soon)
                    </SelectItem>
                    <SelectItem value="UGM" disabled>
                      Univ. Gadjah Mada (Soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Study Program (Prodi)
                </Label>
                <Select
                  value={sessionProfile.prodi}
                  onValueChange={(val) =>
                    setSessionProfile({ ...sessionProfile, prodi: val })
                  }
                >
                  <SelectTrigger className="bg-slate-50/50 border-slate-200 font-display text-sm h-12 rounded-xl focus:ring-blue-700/20">
                    <SelectValue placeholder="Select Prodi" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="INFORMATIKA">INFORMATIKA</SelectItem>
                    <SelectItem value="SISTEM INFORMASI" disabled>
                      SISTEM INFORMASI (Coming Soon)
                    </SelectItem>
                    <SelectItem value="TEKNIK ELEKTRO" disabled>
                      TEKNIK ELEKTRO (Coming Soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                    Target Semester
                  </Label>
                  <Select
                    value={sessionProfile.semester.toString()}
                    onValueChange={(val) =>
                      setSessionProfile({
                        ...sessionProfile,
                        semester: parseInt(val),
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50/50 border-slate-200 font-display text-sm h-12 rounded-xl focus:ring-blue-700/20">
                      <SelectValue placeholder="Sem" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <SelectItem key={s} value={s.toString()}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                    Max SKS Load
                  </Label>
                  <Input
                    type="number"
                    value={sessionProfile.maxSks}
                    onChange={(e) =>
                      setSessionProfile({
                        ...sessionProfile,
                        maxSks: parseInt(e.target.value),
                      })
                    }
                    className="bg-slate-50/50 border-slate-200 font-mono text-sm h-12 rounded-xl focus:ring-blue-700/20"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={onStart}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white h-14 rounded-2xl font-display font-bold text-base shadow-xl shadow-blue-100 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Initialize Session
            </Button>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono text-slate-400 uppercase tracking-[0.4em] pt-4">
        POWERED BY THE CORE ARCHITECT ENGINE
      </p>
    </div>
  );
}
