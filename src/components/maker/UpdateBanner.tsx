import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/ui/icon";
import { useMemo, useState } from "react";
import { UpdateHistoryDialog } from "./UpdateHistoryDialog";

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

function formatTime(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
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

interface UpdateEvent {
  _id: Id<"update_events">;
  prodi: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  active: boolean;
  _creationTime: number;
}

interface UpdateBannerProps {
  prodi?: string;
}

export function UpdateBanner({ prodi }: UpdateBannerProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const rawEvents = useQuery(api.updateEvents.listActiveEvents, {
    prodi: undefined,
  });

  // Show only the single latest event for the selected prodi
  const latestEvent = useMemo<UpdateEvent | null>(() => {
    if (!rawEvents) return null;
    const filtered = prodi
      ? rawEvents.filter((e: UpdateEvent) => e.prodi === prodi)
      : rawEvents;
    return filtered.length > 0 ? filtered[0] : null;
  }, [rawEvents, prodi]);

  if (!latestEvent) return null;

  const icon = severityIcon[latestEvent.severity] ?? severityIcon.info;

  return (
    <>
      <div className="mb-4 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2 px-4 py-1.5 text-caption text-foreground">
          {/* Left: icon + title + detail */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <Icon name={icon as any} size={14} className="shrink-0" />
            <span className="font-semibold">{latestEvent.title}</span>
            {latestEvent.message && (
              <span className="text-muted-foreground">
                ({latestEvent.message.replace(/^prodi\s+[^:]+:\s*/i, "")})
              </span>
            )}
            <span className="rounded bg-foreground/10 px-1 py-0.5 text-data-sm font-mono">
              {latestEvent.prodi}
            </span>
            <span className="text-data-sm opacity-70">
              {timeAgo(latestEvent._creationTime)} &bull;{" "}
              {formatTime(latestEvent._creationTime)}
            </span>
          </div>

          {/* Right: history link */}
          {prodi && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="ml-2 shrink-0 text-data-sm text-primary underline-offset-2 hover:underline"
            >
              Lihat riwayat
            </button>
          )}
        </div>
      </div>

      {prodi && (
        <UpdateHistoryDialog
          prodi={prodi}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
    </>
  );
}
