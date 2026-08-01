import { useState, type CSSProperties, type ReactNode } from "react";

import { cn, formatBytes } from "@/lib/utils";
import {
  blockTitle,
  diskUsageColor,
  shortLabel,
  type DiskUsageBlock,
  type DiskUsagePaletteId,
  type DiskUsageRect,
} from "@/lib/disk-usage-layout";

export type DiskUsageStyle = {
  /** Gap between tiles as fraction of map (0–0.05). */
  gap: number;
  /** Tile corner radius in px. */
  tileRadius: number;
  /** Frame inner padding in px. */
  framePadding: number;
  /** Frame corner radius in px. */
  frameRadius: number;
  /** Torrent fill mix strength 0–100. */
  colorMix: number;
  /** Opacity of non-hovered tiles when something is hovered (0–100). */
  dimOpacity: number;
  /** Hover brightness percent (100 = none). */
  hoverBrightness: number;
  /** Map aspect ratio width/height (e.g. 1.6 ≈ 16/10). */
  aspect: number;
  /** Torrent color palette. */
  palette: DiskUsagePaletteId;
};

export const DEFAULT_DISK_USAGE_STYLE: DiskUsageStyle = {
  gap: 0,
  tileRadius: 0,
  framePadding: 0,
  frameRadius: 12,
  colorMix: 65,
  dimOpacity: 54,
  hoverBrightness: 108,
  aspect: 2.3,
  palette: "warm",
};

type MapProps = {
  rects: DiskUsageRect[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  styleOpts: DiskUsageStyle;
  className?: string;
};

function pct(n: number): string {
  return `${(n * 100).toFixed(3)}%`;
}

function TileShell({
  rect,
  className,
  style,
  hovered,
  dimmed,
  dimOpacity,
  hoverBrightness,
  onHover,
  children,
}: {
  rect: DiskUsageRect;
  className?: string;
  style?: CSSProperties;
  hovered: boolean;
  dimmed: boolean;
  dimOpacity: number;
  hoverBrightness: number;
  onHover: (id: string | null) => void;
  children?: ReactNode;
}) {
  const showLabel = rect.w * rect.h > 0.03;
  const showSize = rect.w * rect.h > 0.06;

  return (
    <div
      title={blockTitle(rect)}
      aria-label={blockTitle(rect).replace("\n", " — ")}
      onMouseEnter={() => onHover(rect.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "absolute overflow-hidden transition-[opacity,filter,box-shadow] duration-150",
        className,
      )}
      style={{
        left: pct(rect.x),
        top: pct(rect.y),
        width: pct(rect.w),
        height: pct(rect.h),
        opacity: dimmed ? dimOpacity / 100 : 1,
        filter: hovered ? `brightness(${hoverBrightness}%)` : undefined,
        zIndex: hovered ? 10 : undefined,
        ...style,
      }}
    >
      {children}
      {showLabel ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-0.5 p-2">
          <span className="truncate text-[0.65rem] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
            {rect.kind === "free" ? "Free" : shortLabel(rect.label)}
          </span>
          {showSize ? (
            <span className="truncate text-[0.6rem] tabular-nums opacity-70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
              {formatBytes(rect.bytes, 1)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LiteList({
  blocks,
  hoveredId,
  onHover,
  palette,
  className,
}: {
  blocks: DiskUsageBlock[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  palette: DiskUsagePaletteId;
  className?: string;
}) {
  const items = [...blocks].sort((a, b) => b.bytes - a.bytes);

  return (
    <ul
      className={cn(
        "max-h-48 space-y-0.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-none",
        className,
      )}
    >
      {items.map((block) => {
        const color = diskUsageColor(block, palette);
        const on = hoveredId === block.id;
        return (
          <li key={block.id}>
            <button
              type="button"
              onMouseEnter={() => onHover(block.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(block.id)}
              onBlur={() => onHover(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors",
                on ? "bg-white/8" : "hover:bg-white/4",
              )}
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  block.kind === "free" &&
                    "border border-dashed border-white/35 bg-transparent",
                )}
                style={
                  block.kind === "free" ? undefined : { backgroundColor: color }
                }
                aria-hidden
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[0.6875rem]",
                  on ? "text-white/90" : "text-white/65",
                )}
              >
                {block.kind === "free" ? "Free" : block.label}
              </span>
              <span className="shrink-0 text-[0.625rem] tabular-nums text-white/35">
                {formatBytes(block.bytes, 1)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DiskUsageGlassIslandsMap({
  rects,
  hoveredId,
  onHover,
  styleOpts,
  className,
}: MapProps) {
  const {
    gap,
    tileRadius,
    framePadding,
    frameRadius,
    colorMix,
    dimOpacity,
    hoverBrightness,
    aspect,
    palette,
  } = styleOpts;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-white/15 bg-black/35",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        className,
      )}
      style={{
        aspectRatio: String(aspect),
        padding: framePadding,
        borderRadius: frameRadius,
      }}
    >
      <div className="relative h-full w-full">
        {rects.map((rect) => {
          const inset = {
            ...rect,
            x: rect.x + gap / 2,
            y: rect.y + gap / 2,
            w: Math.max(0, rect.w - gap),
            h: Math.max(0, rect.h - gap),
          };
          const free = rect.kind === "free";
          const color = diskUsageColor(rect, palette);
          return (
            <TileShell
              key={rect.id}
              rect={inset}
              hovered={hoveredId === rect.id}
              dimmed={hoveredId != null && hoveredId !== rect.id}
              dimOpacity={dimOpacity}
              hoverBrightness={hoverBrightness}
              onHover={onHover}
              className={cn(
                "border text-white/90",
                free
                  ? "border-white/10 bg-white/5 text-white/45"
                  : "border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
              )}
              style={{
                borderRadius: tileRadius,
                ...(free
                  ? {}
                  : {
                      backgroundColor: `color-mix(in oklab, ${color} ${colorMix}%, transparent)`,
                    }),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Glass islands map + lite color legend with soft hover highlight. */
export function DiskUsageView({
  rects,
  blocks,
  className,
  legendListClassName,
  styleOpts = DEFAULT_DISK_USAGE_STYLE,
}: {
  rects: DiskUsageRect[];
  blocks: DiskUsageBlock[];
  className?: string;
  legendListClassName?: string;
  styleOpts?: DiskUsageStyle;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-stretch",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <DiskUsageGlassIslandsMap
          rects={rects}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          styleOpts={styleOpts}
        />
      </div>
      <div className="flex w-full shrink-0 flex-col sm:w-56 sm:max-h-[min(70vh,36rem)]">
        <p className="mb-1.5 text-[0.55rem] font-medium uppercase tracking-wider text-white/40">
          Legend
        </p>
        <LiteList
          blocks={blocks}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          palette={styleOpts.palette}
          className={cn("min-h-0 flex-1 sm:max-h-none", legendListClassName)}
        />
      </div>
    </div>
  );
}
