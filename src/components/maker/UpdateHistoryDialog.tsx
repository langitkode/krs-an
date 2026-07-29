import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogClose,
} from "@/components/ui/dialog";

function timeAgo(ts: number): string {
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return rtf.format(-weeks, "week");
  const months = Math.floor(days / 30);
  return rtf.format(-months, "month");
}

function formatAbsolute(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${date}, ${time.replace(":", ".")} WIB`;
}

const severityIcon: Record<string, string> = {
  info: "info",
  success: "check",
  warning: "alert",
};

const severityColor: Record<string, string> = {
  success: "text-primary",
  warning: "text-amber-500",
  info: "text-muted-foreground",
};

interface UpdateHistoryDialogProps {
  prodi: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateHistoryDialog({
  prodi,
  open,
  onOpenChange,
}: UpdateHistoryDialogProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.updateEvents.listEventHistory,
    open ? { prodi } : "skip",
    { initialNumItems: 10 },
  );

  // const stripProdi = (msg: string) =>
  //   msg.replace(/^prodi\s+[^:]+:\s*/i, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex flex-col overflow-hidden"
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Riwayat Perubahan Jadwal</DialogTitle>
          <DialogDescription className="mt-0.5">
            Seluruh perubahan katalog kelas untuk prodi{" "}
            <span className="font-semibold text-foreground">{prodi}</span>,
            terbaru teratas.
          </DialogDescription>
        </div>

        <DialogBody className="custom-scrollbar flex-1 overflow-y-auto p-0">
          {status === "LoadingFirstPage" ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-body-sm">
              Memuat riwayat...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Icon name="info" size={24} />
              <p className="text-body-sm">Belum ada riwayat perubahan.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((event) => {
                const icon = severityIcon[event.severity] ?? "info";
                const color = severityColor[event.severity] ?? "text-muted-foreground";
                // const detail = event.message ? stripProdi(event.message) : null;
                return (
                  <div
                    key={event._id}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <span className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon name={icon as any} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-label font-semibold text-foreground">
                          {event.title}
                        </span>
                        {!event.active && (
                          <span className="rounded bg-muted px-1 py-0.5 text-data-sm text-muted-foreground">
                            arsip
                          </span>
                        )}
                      </div>
                      {/*{detail && (
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {detail}
                        </p>
                      )}*/}
                      <p className="mt-1 text-data-sm text-muted-foreground/70">
                        {timeAgo(event._creationTime)} -{" "}
                        {formatAbsolute(event._creationTime)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {status === "CanLoadMore" && (
            <div className="flex justify-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMore(10)}
              >
                Muat 10 lebih banyak
              </Button>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="flex justify-center py-4 text-caption text-muted-foreground">
              Memuat...
            </div>
          )}
        </DialogBody>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
