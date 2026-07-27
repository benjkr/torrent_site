import { useEffect, useId, useMemo, useRef, useState } from "react";
import { HardDriveIcon } from "lucide-react";

import { DiskUsageView } from "@/components/DiskUsageDesigns";
import { useDominantColorMap } from "@/lib/dominant-color";
import {
  buildDiskUsageBlocks,
  layoutDiskUsage,
} from "@/lib/disk-usage-layout";
import { imdbIdFromTags } from "@/lib/imdb";
import { useImdbMetaMap } from "@/lib/imdb-meta";
import { useMaindata } from "@/lib/maindata";
import { cn, formatBytes } from "@/lib/utils";

export type FreeSpaceData = {
  available: number;
};

const glassShell = cn(
  "border border-white/20 bg-white/10",
  "shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

/** Same dense-glass shell as the torrent file viewer popover. */
const denseGlassCard = cn(
  "overflow-hidden rounded-2xl border border-white/20 bg-zinc-900/80 p-2.5 text-white",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

/** Parse qB `server_state.free_space_on_disk` (bytes). */
export function freeSpaceFromServerState(
  serverState: Record<string, unknown> | null | undefined,
): number | null {
  if (!serverState) return null;
  const raw = serverState.free_space_on_disk;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** Live free space from qB maindata `free_space_on_disk`. */
export function useQbFreeSpace(): FreeSpaceData | null {
  const { snapshot, online } = useMaindata();
  if (!online) return null;
  const available = freeSpaceFromServerState(snapshot.server_state);
  if (available == null) return null;
  return { available };
}

/** Frosted glass pill — click opens disk usage popup. */
export function FreeSpacePill({
  data,
  className,
}: {
  data: FreeSpaceData;
  className?: string;
}) {
  const { torrents, online } = useMaindata();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const free = formatBytes(data.available, 1);

  const imdbIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of torrents) {
      const id = imdbIdFromTags(t.tags);
      if (id) ids.add(id);
    }
    return Array.from(ids);
  }, [torrents]);

  const metaMap = useImdbMetaMap(imdbIds);

  const posterUrls = useMemo(() => {
    const urls: string[] = [];
    for (const t of torrents) {
      const id = imdbIdFromTags(t.tags);
      const image = id ? metaMap[id]?.image : null;
      if (image) urls.push(image);
    }
    return urls;
  }, [torrents, metaMap]);

  const colorByUrl = useDominantColorMap(posterUrls);

  const colorsByHash = useMemo(() => {
    const out: Record<string, string> = {};
    for (const t of torrents) {
      const id = imdbIdFromTags(t.tags);
      const image = id ? metaMap[id]?.image : null;
      if (!image) continue;
      const color = colorByUrl[image];
      if (color) out[t.hash] = color;
    }
    return out;
  }, [torrents, metaMap, colorByUrl]);

  const blocks = online
    ? buildDiskUsageBlocks(torrents, data.available, colorsByHash)
    : [];
  const rects = layoutDiskUsage(blocks);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        title={`${free} available — click for disk usage`}
        aria-label={`Disk space: ${free} available. Open disk usage.`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
          glassShell,
          "cursor-pointer transition-colors hover:bg-white/14",
        )}
      >
        <HardDriveIcon className="size-3 shrink-0 text-white/45" />
        <span className="text-[0.6875rem] font-medium tabular-nums leading-none text-white/90">
          {free}
        </span>
        <span className="text-[0.625rem] leading-none text-white/35">free</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Disk usage"
          className={cn(
            "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,34rem)]",
            denseGlassCard,
          )}
        >
          <div className="mb-1.5 px-1.5 pt-0.5">
            <p className="text-[0.625rem] font-medium text-white/55">
              Disk usage
            </p>
          </div>
          {blocks.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-white/50">
              No size data yet.
            </p>
          ) : (
            <DiskUsageView rects={rects} blocks={blocks} />
          )}
        </div>
      ) : null}
    </div>
  );
}
