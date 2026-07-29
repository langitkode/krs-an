import { useState, useCallback, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const WA_UPDATE =
  "https://chat.whatsapp.com/L2yBm9Q6ljC9VuHqVqfqll?s=cl&p=a&mlu=4&amv=1";
const WA_BUILD =
  "https://chat.whatsapp.com/EeCv7VftvY4FvsSZY8uh1R?s=cl&p=a&mlu=4&amv=1";
const RATE_LIMIT_MS = 2_000;

export function WhatsAppFab() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [hasSeen, setHasSeen] = useLocalStorage("has_seen_wa_popup", false);
  // Auto-open after mount (deferred so prerender captures DOM without popover)
  useEffect(() => {
    if (!hasSeen) setTimeout(() => setOpen(true), 0);
  }, [hasSeen]);

  const openLink = useCallback(
    (url: string) => {
      if (cooldown) return;
      setCooldown(true);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => setCooldown(false), RATE_LIMIT_MS);
    },
    [cooldown],
  );

  const handleNext = useCallback(() => {
    setShowChannels(true);
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setShowChannels(false);
          setName("");
        }
      }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("community.title")}
          className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          <img src="/wa-logo.png" alt="" className="size-9" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-4">
        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <img src="/wa-logo.png" alt="" className="size-5" />
            <span className="text-label font-semibold text-foreground">
              {t("community.title")}
            </span>
          </div>

          {/* Description */}
          <p className="text-body-sm text-muted-foreground">
            {t("community.desc")}
          </p>

          {!showChannels ? (
            <>
              {/* Name input */}
              <Input
                placeholder={t("community.name_placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNext();
                }}
              />
              <Button size="sm" className="w-full" onClick={handleNext}>
                {t("community.next")}
              </Button>
            </>
          ) : (
            <>
              {/* WA Community 1: Update KRSan */}
              <div className="rounded-card border bg-card p-3">
                <p className="text-body-sm font-medium text-foreground">
                  Update KRSan
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {t("community.update_desc")}
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => openLink(WA_UPDATE)}
                  disabled={cooldown}
                >
                  {t("community.join")}
                </Button>
              </div>

              {/* WA Community 2: Ikut bikin/testing */}
              <div className="rounded-card border bg-card p-3">
                <p className="text-body-sm font-medium text-foreground">
                  {t("community.build_title")}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {t("community.build_desc")}
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => openLink(WA_BUILD)}
                  disabled={cooldown}
                >
                  {t("community.join")}
                </Button>
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setHasSeen(true);
                }}
                className="w-full text-center text-caption text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {t("community.later")}
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
