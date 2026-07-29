import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { prodiLabel } from "../hooks/useProdiOptions";

interface SplitByPrefixDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prodiOptions: { _id: string; name: string; university?: string }[];
}

interface MappingRow {
  prefix: string;
  prodi: string;
}

/**
 * Reassign every master_courses row under one prodi to a different prodi
 * based on which class-code prefix it matches -- for a prodi that turns out
 * to actually be several study programs lumped together (e.g. a faculty
 * name used by mistake), without a code change per occurrence.
 */
export function SplitByPrefixDialog({
  isOpen,
  onClose,
  prodiOptions,
}: SplitByPrefixDialogProps) {
  const splitByPrefix = useMutation(api.admin.splitMasterCoursesByPrefix);
  const copyByPrefix = useMutation(api.admin.copyMasterCoursesByPrefix);
  const deleteByPrefix = useMutation(api.admin.deleteMasterCoursesByPrefix);

  const [sourceProdi, setSourceProdi] = useState("");
  const [mappings, setMappings] = useState<MappingRow[]>([
    { prefix: "", prodi: "" },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sorted = [...prodiOptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const updateMapping = (index: number, patch: Partial<MappingRow>) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
  };

  const addMapping = () =>
    setMappings((prev) => [...prev, { prefix: "", prodi: "" }]);

  const removeMapping = (index: number) =>
    setMappings((prev) => prev.filter((_, i) => i !== index));

  const canRun =
    sourceProdi.length > 0 &&
    mappings.some((m) => m.prefix.trim() && m.prodi);

  const canDelete =
    sourceProdi.length > 0 &&
    mappings.some((m) => m.prefix.trim() !== "");

  const isPending = isRunning || isCopying || isDeleting;

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const validMappings = mappings.filter(
        (m) => m.prefix.trim() && m.prodi,
      );
      const result = await splitByPrefix({
        sourceProdi,
        mappings: validMappings,
      });
      const perTargetSummary = Object.entries(result.perTarget)
        .map(([prodi, count]) => `${count} ke ${prodi}`)
        .join(", ");
      toast.success(
        `${result.moved} dipindah (${perTargetSummary || "tidak ada"}).` +
          (result.unmatched > 0
            ? ` ${result.unmatched} tidak cocok prefix manapun, tidak dipindah.`
            : ""),
      );
      setSourceProdi("");
      setMappings([{ prefix: "", prodi: "" }]);
      onClose();
    } catch (err: any) {
      toast.error("Split gagal: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const validMappings = mappings.filter(
        (m) => m.prefix.trim() && m.prodi,
      );
      const result = await copyByPrefix({
        sourceProdi,
        mappings: validMappings,
      });
      const perTargetSummary = Object.entries(result.perTarget)
        .map(([prodi, count]) => `${count} ke ${prodi}`)
        .join(", ");
      toast.success(
        `${result.copied} disalin (${perTargetSummary || "tidak ada"}).` +
          (result.unmatched > 0
            ? ` ${result.unmatched} tidak cocok prefix manapun, tidak disalin.`
            : ""),
      );
      // Intentionally no form reset: admin may want to follow up with
      // Jalankan Split using the same config.
    } catch (err: any) {
      toast.error("Copy gagal: " + err.message);
    } finally {
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    const validPrefixes = mappings.map((m) => m.prefix.trim()).filter(Boolean);
    if (validPrefixes.length === 0) return;

    const confirmMsg = `PERINGATAN: Tindakan ini akan menghapus semua kelas dari prodi "${sourceProdi}" yang memiliki prefix berikut secara permanen:\n\n${validPrefixes.join(", ")}\n\nApakah Anda yakin ingin menghapus data ini?`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const result = await deleteByPrefix({
        sourceProdi,
        prefixes: validPrefixes,
      });
      toast.success(
        `${result.deleted} kelas berhasil dihapus dari ${sourceProdi} (${result.unmatched} tidak cocok).`
      );
    } catch (err: any) {
      toast.error("Hapus gagal: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl" className="custom-scrollbar">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-headline text-foreground">
            <Icon name="external-link" className="text-primary" size={20} />
            Split Prodi Berdasarkan Prefix Kelas
          </DialogTitle>
          <DialogDescription className="pt-1 font-mono text-caps uppercase text-muted-foreground">
            Pindahkan data dari satu prodi ke beberapa prodi lain berdasarkan
            awalan kode kelas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Prodi Sumber</Label>
            <Select value={sourceProdi} onValueChange={setSourceProdi}>
              <SelectTrigger className="h-10 rounded-control border-border bg-muted/50">
                <SelectValue placeholder="Pilih prodi yang mau dipecah..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-control border-border">
                {sorted.map((p) => (
                  <SelectItem key={p._id} value={p.name} className="text-caption">
                    {prodiLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Aturan Prefix Kelas
            </Label>
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Prefix, mis. EP-"
                  value={m.prefix}
                  onChange={(e) =>
                    updateMapping(i, { prefix: e.target.value })
                  }
                  className="h-9 flex-1 rounded-control border-border bg-card font-mono"
                />
                <Icon
                  name="chevron-right"
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <Select
                  value={m.prodi}
                  onValueChange={(val) => updateMapping(i, { prodi: val })}
                >
                  <SelectTrigger className="h-9 flex-1 rounded-control border-border bg-card">
                    <SelectValue placeholder="Prodi tujuan..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-control border-border">
                    {sorted.map((p) => (
                      <SelectItem
                        key={p._id}
                        value={p.name}
                        className="text-caption"
                      >
                        {prodiLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(i)}
                  disabled={mappings.length === 1}
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addMapping}
              className="rounded-control text-caption"
            >
              <Icon name="plus" size={14} className="mr-2" />
              Tambah Aturan
            </Button>
          </div>

          <p className="rounded-card border border-border bg-muted p-3 text-caption text-muted-foreground">
            Aturan prefix akan memindahkan atau menyalin data kelas ke prodi tujuan.
            Untuk <strong>Hapus</strong>, kolom &quot;Prodi tujuan&quot; akan diabaikan (hanya prefix yang digunakan).
          </p>
        </div>

        <DialogFooter className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} className="text-caps uppercase">
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={!canDelete || isPending}
            className="px-6 text-caps uppercase text-destructive hover:bg-destructive/10"
          >
            {isDeleting ? "Menghapus..." : "Jalankan Hapus"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!canRun || isPending}
            className="px-6 text-caps uppercase"
          >
            {isCopying ? "Menyalin..." : "Jalankan Copy"}
          </Button>
          <Button
            onClick={handleRun}
            disabled={!canRun || isPending}
            className="px-6 text-caps uppercase"
          >
            {isRunning ? "Memproses..." : "Jalankan Split"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
