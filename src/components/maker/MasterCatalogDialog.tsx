import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, PlusCircle } from "lucide-react";
import { useState } from "react";

interface MasterCatalogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allMasterCourses: any[] | undefined;
  onAddCourse: (course: any) => void;
}

export function MasterCatalogDialog({
  isOpen,
  onOpenChange,
  allMasterCourses,
  onAddCourse,
}: MasterCatalogDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaster = allMasterCourses?.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white rounded-3xl p-6 border-none shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-700" />
            Master Catalog
          </DialogTitle>
          <DialogDescription className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-1">
            University Component Database
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-10 text-xs focus-visible:ring-blue-700"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
          {filteredMaster?.map((c, i) => (
            <div
              key={i}
              className="p-3 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 hover:border-blue-100 rounded-xl transition-all cursor-pointer group flex justify-between items-center"
              onClick={() => onAddCourse(c)}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                    {c.code}
                  </span>
                  <span className="text-[9px] font-mono text-blue-700 font-bold uppercase">
                    {c.class}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                  {c.name}
                </p>
                <p className="text-[9px] text-slate-500 italic truncate max-w-[200px]">
                  {c.lecturer}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <Badge
                  variant="outline"
                  className="bg-white text-[9px] font-mono border-slate-200 text-slate-600"
                >
                  {c.sks} SKS
                </Badge>
                <PlusCircle className="w-4 h-4 text-slate-300 group-hover:text-blue-700 transition-colors" />
              </div>
            </div>
          ))}
          {filteredMaster?.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Search className="w-5 h-5 text-slate-300 mx-auto" />
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                No components found
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-mono text-[9px] uppercase tracking-widest text-slate-400"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
