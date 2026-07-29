import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/ui/icon";
import { useMemo } from "react";

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
  const rawEvents = useQuery(api.updateEvents.listActiveEvents, {
    prodi: undefined,
  });

  const visibleEvents = useMemo(() => {
    if (!rawEvents) return [];
    return prodi
      ? rawEvents.filter((e: UpdateEvent) => e.prodi === prodi)
      : rawEvents;
  }, [rawEvents, prodi]);

  if (!visibleEvents || visibleEvents.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col">
      {visibleEvents.map((event: UpdateEvent) => {
        const icon = severityIcon[event.severity] ?? severityIcon.info;
        return (
          <div
            key={event._id}
            className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-caption text-foreground bg-muted/50"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <Icon name={icon as any} size={14} className="shrink-0" />
              <span className="font-semibold">{event.title}</span>
              {event.message && (
                <span className="text-muted-foreground">
                  ({event.message.replace(/^prodi\s+[^:]+:\s*/i, "")})
                </span>
              )}
              <span className="rounded bg-foreground/10 px-1 py-0.5 text-data-sm font-mono">
                {event.prodi}
              </span>
              <span className="text-data-sm opacity-70">
                {timeAgo(event._creationTime)} • {formatTime(event._creationTime)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
