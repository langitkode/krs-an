import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-headline text-primary">
      {[1, 2, 3, 4, 5].map((s) => (s <= rating ? "★" : "☆"))}
    </span>
  );
}

export function FeedbackTab() {
  const feedback = useQuery(api.feedback.listFeedback);

  if (feedback === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
        <p className="text-title">Belum ada masukan.</p>
        <p className="text-caption">Feedback akan muncul di sini setelah pengguna mengirimkannya.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-data-sm text-muted-foreground">
        {feedback.length} masukan terkumpul
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {feedback.map((f) => (
          <div
            key={f._id}
            className="rounded-card border border-border bg-card p-3 space-y-2"
          >
            {/* Header: rating + date */}
            <div className="flex items-center justify-between gap-2">
              <StarDisplay rating={f.rating} />
              <span className="text-data-sm text-muted-foreground shrink-0">
                {new Date(f.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {/* Message */}
            {f.message && (
              <p className="text-body-sm text-foreground line-clamp-3">
                {f.message}
              </p>
            )}

            {/* Footer: save count + user hint */}
            <div className="flex items-center gap-2 pt-1">
              <span className="rounded bg-muted px-1.5 py-0.5 text-data-sm font-mono text-muted-foreground">
                #{f.saveCount}
              </span>
              <span className="text-data-sm text-muted-foreground truncate" title={f.email || f.tokenIdentifier}>
                {f.email || (f.tokenIdentifier ? `id-${f.tokenIdentifier.slice(-8)}` : "Anonymous")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
