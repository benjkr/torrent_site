import { CloudOffIcon, WifiIcon } from "lucide-react";

import { AppVersionPill } from "@/components/shared/AppVersionPill";
import { useQbStatus } from "@/lib/qb-status";
import { cn } from "@/lib/utils";

const engravedStatusPill = cn(
  "rounded-full border border-black/60",
  "bg-[#0c0c0c]",
  "shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
  "inline-flex h-5 items-center gap-1.5 px-2",
  "font-mono text-[0.625rem] tracking-tight",
);

function QbStatusPill() {
  const status = useQbStatus();

  if (status.state === "online") {
    return (
      <span
        title={`qBittorrent ${status.version}`}
        aria-label={`qBittorrent online, version ${status.version}`}
        className={cn(engravedStatusPill, "text-emerald-300/90")}
      >
        <WifiIcon className="size-3 opacity-70" />
        {status.version}
      </span>
    );
  }

  if (status.state === "offline") {
    return (
      <span
        title={status.error}
        aria-label={`qBittorrent offline: ${status.error}`}
        className={cn(engravedStatusPill, "text-red-300/90")}
      >
        <CloudOffIcon className="size-3 opacity-70" />
        Offline
      </span>
    );
  }

  return null;
}

/** Desktop top-left: engraved app tag/hash above qB status. */
export function StatusCorner() {
  return (
    <div className="pointer-events-none fixed top-4 left-4 z-50 flex flex-col items-start gap-1.5">
      <AppVersionPill />
      <QbStatusPill />
    </div>
  );
}
