import { formatBytes } from "@/lib/utils";

export type DiskUsageBlock = {
  id: string;
  label: string;
  bytes: number;
  kind: "torrent" | "free";
  /** 0–1 when kind is torrent */
  progress?: number;
  state?: string;
  /** Optional poster dominant color (hex). Overrides palette when set. */
  color?: string;
};

export type DiskUsageRect = DiskUsageBlock & {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Worst aspect ratio in a row (closer to 1 is better). */
function worst(
  row: number[],
  rowSum: number,
  side: number,
): number {
  if (row.length === 0 || side <= 0 || rowSum <= 0) return Infinity;
  let maxR = 0;
  let minR = Infinity;
  for (const v of row) {
    const r = (v * side * side) / (rowSum * rowSum);
    maxR = Math.max(maxR, r);
    minR = Math.min(minR, r);
  }
  return Math.max(maxR, 1 / minR);
}

/**
 * Squarified treemap layout in normalized 0–1 coordinates.
 * Larger `bytes` → larger rectangle.
 */
export function layoutDiskUsage(
  blocks: DiskUsageBlock[],
): DiskUsageRect[] {
  const items = blocks
    .filter((b) => b.bytes > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.bytes - a.bytes);

  if (items.length === 0) return [];

  const total = items.reduce((s, b) => s + b.bytes, 0);
  if (total <= 0) return [];

  const areas = items.map((b) => b.bytes / total);
  const out: DiskUsageRect[] = [];

  let x = 0;
  let y = 0;
  let w = 1;
  let h = 1;
  let i = 0;

  while (i < areas.length) {
    const vertical = w >= h;
    const side = vertical ? h : w;
    const row: number[] = [];
    let rowSum = 0;

    while (i < areas.length) {
      const next = areas[i]!;
      const trial = [...row, next];
      const trialSum = rowSum + next;
      if (
        row.length > 0 &&
        worst(trial, trialSum, side) > worst(row, rowSum, side)
      ) {
        break;
      }
      row.push(next);
      rowSum = trialSum;
      i += 1;
    }

    const rowThickness = side > 0 ? rowSum / side : 0;
    let cursor = vertical ? y : x;

    for (let r = 0; r < row.length; r++) {
      const area = row[r]!;
      const len = rowSum > 0 ? (area / rowSum) * side : 0;
      const block = items[i - row.length + r]!;
      if (vertical) {
        out.push({
          ...block,
          x,
          y: cursor,
          w: rowThickness,
          h: len,
        });
      } else {
        out.push({
          ...block,
          x: cursor,
          y,
          w: len,
          h: rowThickness,
        });
      }
      cursor += len;
    }

    if (vertical) {
      x += rowThickness;
      w -= rowThickness;
    } else {
      y += rowThickness;
      h -= rowThickness;
    }
  }

  return out;
}

export function shortLabel(name: string, max = 18): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export function blockTitle(block: DiskUsageBlock): string {
  const size = formatBytes(block.bytes, 1);
  if (block.kind === "free") return `${size} free`;
  return `${block.label}\n${size}`;
}

export type DiskUsagePaletteId =
  | "spectrum"
  | "cool"
  | "warm"
  | "neon"
  | "mono"
  | "forest"
  | "candy";

export const DISK_USAGE_PALETTES: {
  id: DiskUsagePaletteId;
  label: string;
  hint: string;
}[] = [
  { id: "spectrum", label: "Spectrum", hint: "Full rainbow (default)" },
  { id: "cool", label: "Cool", hint: "Blues, cyans, violets" },
  { id: "warm", label: "Warm", hint: "Ambers, oranges, reds" },
  { id: "neon", label: "Neon", hint: "High-chroma accents" },
  { id: "mono", label: "Mono", hint: "Soft grayscale" },
  { id: "forest", label: "Forest", hint: "Greens and teals" },
  { id: "candy", label: "Candy", hint: " discrete pastel stops" },
];

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

const CANDY_STOPS = [
  "oklch(0.74 0.16 20)",
  "oklch(0.76 0.14 55)",
  "oklch(0.78 0.15 145)",
  "oklch(0.75 0.12 195)",
  "oklch(0.72 0.16 265)",
  "oklch(0.74 0.15 310)",
  "oklch(0.77 0.13 340)",
];

const NEON_STOPS = [
  "oklch(0.78 0.28 145)",
  "oklch(0.75 0.26 195)",
  "oklch(0.72 0.28 300)",
  "oklch(0.8 0.24 90)",
  "oklch(0.74 0.27 25)",
  "oklch(0.76 0.25 250)",
];

/** Stable color from id + palette. Prefers poster `color` when set. */
export function diskUsageColor(
  block: Pick<DiskUsageBlock, "id" | "kind" | "color">,
  palette: DiskUsagePaletteId = "spectrum",
): string {
  if (block.kind === "free") return "oklch(0.72 0.02 240)";
  if (block.color) return block.color;
  const h = hashHue(block.id);

  switch (palette) {
    case "cool":
      return `oklch(0.72 0.13 ${180 + (h % 120)})`;
    case "warm":
      return `oklch(0.74 0.15 ${h % 70})`;
    case "neon":
      return NEON_STOPS[h % NEON_STOPS.length]!;
    case "mono": {
      const L = 0.55 + (h % 35) / 100;
      return `oklch(${L} 0.02 250)`;
    }
    case "forest":
      return `oklch(0.7 0.13 ${120 + (h % 80)})`;
    case "candy":
      return CANDY_STOPS[h % CANDY_STOPS.length]!;
    case "spectrum":
    default:
      return `oklch(0.72 0.14 ${h % 360})`;
  }
}

/** Build treemap blocks from library torrents + optional free space. */
export function buildDiskUsageBlocks(
  torrents: {
    hash: string;
    name: string;
    size: number;
    progress: number;
    state: string;
  }[],
  freeBytes: number | null,
  colorsByHash?: Record<string, string>,
): DiskUsageBlock[] {
  const blocks: DiskUsageBlock[] = torrents
    .filter((t) => t.size > 0)
    .map((t) => ({
      id: t.hash,
      label: t.name,
      bytes: t.size,
      kind: "torrent" as const,
      progress: t.progress,
      state: t.state,
      ...(colorsByHash?.[t.hash] ? { color: colorsByHash[t.hash] } : {}),
    }));

  if (freeBytes != null && freeBytes > 0) {
    blocks.push({
      id: "__free__",
      label: "Free",
      bytes: freeBytes,
      kind: "free",
    });
  }

  return blocks;
}
