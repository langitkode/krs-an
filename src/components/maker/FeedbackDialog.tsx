import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { getAnonymousId } from "@/lib/anonymousId";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveCount: number;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  saveCount,
}: FeedbackDialogProps) {
  const { t } = useLanguage();
  const submitFeedback = useMutation(api.feedback.submit);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        rating,
        message: message.trim() || undefined,
        saveCount,
        anonymousId: getAnonymousId(),
      });
      toast.success(t("feedback.success"));
      onOpenChange(false);
    } catch (err: any) {
      if (err?.data?.kind === "RateLimited") {
        toast.error(t("toast.rate_limited"), {
          description: t("toast.rate_limited_desc"),
        });
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  // Reset state on open
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Delay reset so animation finishes
      setTimeout(() => {
        setRating(0);
        setHovered(0);
        setMessage("");
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" hideClose>
        <DialogBody className="space-y-4">
          {/* Title + subtitle + rating, all centered */}
          <div className="flex flex-col items-center gap-1">
            <DialogTitle>{t("feedback.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("feedback.subtitle")}
            </DialogDescription>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="h-10 w-10 rounded-md text-headline transition-colors hover:scale-110 active:scale-95"
                  aria-label={`${star} bintang`}
                >
                  {star <= (hovered || rating) ? (
                    <span className="text-primary">★</span>
                  ) : (
                    <span className="text-muted-foreground">☆</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-caption text-muted-foreground">
              {t("feedback.rating_hint")}
            </p>
          </div>

          {/* Message textarea */}
          <textarea
            value={message}
            onChange={(e) => {
              // Strip HTML tags
              const sanitized = e.target.value.replace(/<\w+[^>]*>/g, "");
              if (sanitized.length <= 500) setMessage(sanitized);
            }}
            placeholder={t("feedback.message_placeholder")}
            className="w-full min-h-[80px] rounded-control border border-border bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 ring-ring"
            maxLength={500}
          />
          <p className="text-data-sm text-muted-foreground text-right">
            {message.length}/500
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>
            {t("feedback.skip")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? "..." : t("feedback.submit")}
          </Button>
        </DialogFooter>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
