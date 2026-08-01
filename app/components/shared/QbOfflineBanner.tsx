import { useEffect, useState } from "react";
import { RefreshCwIcon, WifiOffIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQbStatus } from "@/lib/qb-status";
import { cn } from "@/lib/utils";

/** Top critical banner when qBittorrent is unreachable. */
export function QbOfflineBanner() {
  const status = useQbStatus();
  const [dismissed, setDismissed] = useState(false);

  const offline = status.state === "offline";
  const error = offline ? status.error : "";

  useEffect(() => {
    if (!offline) setDismissed(false);
  }, [offline]);

  if (!offline || dismissed) return null;

  return (
    <div
      className="px-4 pb-2"
      role="alert"
      aria-labelledby="qb-offline-banner-title"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[1.35rem] px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
          "border border-red-400/30 bg-red-950/70",
          "shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "backdrop-blur-2xl backdrop-saturate-150",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-400/20 text-red-200">
            <WifiOffIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2
                id="qb-offline-banner-title"
                className="text-sm font-semibold tracking-tight text-white sm:text-base"
              >
                qBittorrent unreachable
              </h2>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Dismiss"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <p
              className="mt-1 wrap-break-word text-sm leading-relaxed text-red-100/75"
              title={error}
            >
              {error}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-white text-black hover:bg-white/90"
          onClick={() => window.location.reload()}
        >
          <RefreshCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </div>
    </div>
  );
}
