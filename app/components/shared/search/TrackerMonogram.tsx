import { cn } from "@/lib/utils";
import type { TorrentTracker } from "@/lib/types";

const TRACKER_LABEL: Record<TorrentTracker, string> = {
  yts: "YTS",
  piratebay: "Pirate Bay",
};

/** Compact Y / P tile for search result meta rows. */
export function TrackerMonogram({ tracker }: { tracker: TorrentTracker }) {
  const yts = tracker === "yts";
  const name = TRACKER_LABEL[tracker];

  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center self-center rounded-[5px]",
        "text-[0.5625rem] font-semibold leading-none",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_1px_2px_rgba(0,0,0,0.4)]",
        yts
          ? "border border-emerald-300/35 bg-emerald-500 text-emerald-950"
          : "border border-amber-300/30 bg-[#8a5a2b] text-amber-50",
      )}
    >
      {yts ? "Y" : "P"}
    </span>
  );
}
