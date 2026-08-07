import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { cn } from "@/lib/utils";
import {
  packTetris,
  type TetrominoKind,
  type TetrisPacking,
} from "@/lib/tetris-pieces";

export type TetrisDesignId =
  | "classic"
  | "glass"
  | "neon"
  | "blueprint"
  | "soft";

export const TETRIS_DESIGNS: {
  id: TetrisDesignId;
  name: string;
  blurb: string;
}[] = [
  {
    id: "classic",
    name: "Classic Well",
    blurb: "Pieces hard-drop and stack like Tetris. NES bricks.",
  },
  {
    id: "glass",
    name: "Frosted Glass",
    blurb: "Gravity stack on Apple-style dense glass.",
  },
  {
    id: "neon",
    name: "Neon Arcade",
    blurb: "Arcade gravity drops with glow edges.",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    blurb: "Technical well — pieces fall and stack to fill.",
  },
  {
    id: "soft",
    name: "Soft Blocks",
    blurb: "Candy tetrominoes dropping into a soft well.",
  },
];

/** Guideline-ish fills per kind. */
const KIND_COLOR: Record<TetrominoKind, string> = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  L: "#f0a000",
  J: "#0000f0",
  S: "#00f000",
  Z: "#f00000",
};

const KIND_COLOR_SOFT: Record<TetrominoKind, string> = {
  I: "#7dd3fc",
  O: "#fde68a",
  T: "#d8b4fe",
  L: "#fdba74",
  J: "#a5b4fc",
  S: "#86efac",
  Z: "#fca5a5",
};

const KIND_COLOR_NEON: Record<TetrominoKind, string> = {
  I: "#22d3ee",
  O: "#eab308",
  T: "#e879f9",
  L: "#fb923c",
  J: "#60a5fa",
  S: "#4ade80",
  Z: "#f43f5e",
};

const KIND_COLOR_BLUEPRINT: Record<TetrominoKind, string> = {
  I: "#7dd3fc",
  O: "#bae6fd",
  T: "#38bdf8",
  L: "#0ea5e9",
  J: "#0284c7",
  S: "#67e8f9",
  Z: "#a5f3fc",
};

function colorsFor(design: TetrisDesignId): Record<TetrominoKind, string> {
  switch (design) {
    case "soft":
      return KIND_COLOR_SOFT;
    case "neon":
      return KIND_COLOR_NEON;
    case "blueprint":
      return KIND_COLOR_BLUEPRINT;
    default:
      return KIND_COLOR;
  }
}

const denseGlassPopup = cn(
  "w-auto max-w-[min(100vw-2rem,360px)] overflow-hidden p-1.5 text-white",
  "rounded-2xl border border-white/20 bg-zinc-900/80",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "ring-0",
);

export type TetrisPiecesBoardProps = {
  design: TetrisDesignId;
  hash: string;
  total: number;
  complete: number;
  /** When true, animate drops as complete increases. */
  animate?: boolean;
  className?: string;
};

type FallingState = {
  pieceId: number;
  /** 0 = top of well, 1 = landed. */
  t: number;
  born: number;
  /** Fall distance in rows (from above board to minR). */
  fallRows: number;
};

function usePacking(hash: string, total: number): TetrisPacking {
  return useMemo(() => packTetris(hash, total), [hash, total]);
}

/** Popup shell matching the real pieces hover card. */
export function TetrisPiecesPopup({
  design,
  hash,
  total,
  complete,
  animate = true,
  className,
}: TetrisPiecesBoardProps) {
  const packing = usePacking(hash, total);
  const meta = TETRIS_DESIGNS.find((d) => d.id === design)!;

  return (
    <div className={cn(denseGlassPopup, className)}>
      <div className="flex items-baseline justify-between gap-2 px-1.5 pt-0.5 pb-1">
        <div className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
          Pieces · {meta.name}
        </div>
        <div className="text-[0.5625rem] tabular-nums text-white/40">
          {complete.toLocaleString()} of {total.toLocaleString()}
        </div>
      </div>

      <div className="relative flex justify-center px-0.5 py-0.5">
        <TetrisPlayfield
          key={`${hash}:${total}`}
          design={design}
          packing={packing}
          complete={complete}
          animate={animate}
        />
      </div>

      <div className="px-1.5 pt-1 pb-0.5 text-center text-[0.5625rem] tabular-nums text-white/40">
        <span className="text-white/50">{packing.cols}</span>
        <span className="mx-0.5 text-white/25">×</span>
        <span className="text-white/50">{packing.rows}</span>
        <span className="mx-1.5 text-white/20">·</span>
        <span>{packing.total} drops</span>
      </div>
    </div>
  );
}

function TetrisPlayfield({
  design,
  packing,
  complete,
  animate,
}: {
  design: TetrisDesignId;
  packing: TetrisPacking;
  complete: number;
  animate: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** How many pieces have finished their fall animation. */
  const settledRef = useRef(0);
  const queueRef = useRef<number[]>([]);
  const fallingRef = useRef<FallingState | null>(null);
  const [tick, setTick] = useState(0);

  // Sync queue with complete target — play drops one-at-a-time like Tetris
  useEffect(() => {
    const target = Math.max(0, Math.min(complete, packing.total));

    if (!animate) {
      settledRef.current = target;
      queueRef.current = [];
      fallingRef.current = null;
      setTick((n) => n + 1);
      return;
    }

    if (target < settledRef.current) {
      // Scrubbed backward — snap
      settledRef.current = target;
      queueRef.current = [];
      fallingRef.current = null;
      setTick((n) => n + 1);
      return;
    }

    // Large jump: snap, don't queue a long animation storm
    if (target - settledRef.current > 8 && !fallingRef.current) {
      settledRef.current = target;
      queueRef.current = [];
      fallingRef.current = null;
      setTick((n) => n + 1);
      return;
    }

    const queued = new Set(queueRef.current);
    if (fallingRef.current) queued.add(fallingRef.current.pieceId);

    for (let i = settledRef.current; i < target; i++) {
      const piece = packing.pieces[i];
      if (!piece) continue;
      if (queued.has(piece.id)) continue;
      if (fallingRef.current?.pieceId === piece.id) continue;
      queueRef.current.push(piece.id);
    }

    setTick((n) => n + 1);
  }, [complete, packing, animate]);

  // Drive sequential falls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || packing.total === 0) return;

    let raf = 0;
    const MS_PER_ROW = 52;

    const paint = (settled: number, falling: FallingState | null) => {
      paintPlayfield(canvas, design, packing, settled, falling);
    };

    const kickNext = (now: number) => {
      if (fallingRef.current) return;
      const nextId = queueRef.current.shift();
      if (nextId === undefined) {
        paint(settledRef.current, null);
        return;
      }
      const piece = packing.pieces.find((p) => p.id === nextId);
      if (!piece) {
        settledRef.current += 1;
        kickNext(now);
        return;
      }
      fallingRef.current = {
        pieceId: nextId,
        t: 0,
        born: now,
        fallRows: piece.minR + 4,
      };
    };

    const frame = (now: number) => {
      if (!fallingRef.current && queueRef.current.length > 0) {
        kickNext(now);
      }

      const falling = fallingRef.current;
      if (falling) {
        const duration = Math.max(280, falling.fallRows * MS_PER_ROW);
        falling.t = Math.min(1, (now - falling.born) / duration);
        if (falling.t >= 1) {
          settledRef.current += 1;
          fallingRef.current = null;
          kickNext(now);
        }
      }

      paint(settledRef.current, fallingRef.current);

      if (fallingRef.current || queueRef.current.length > 0) {
        raf = requestAnimationFrame(frame);
      }
    };

    // Initial paint + start loop if work pending
    if (fallingRef.current || queueRef.current.length > 0) {
      raf = requestAnimationFrame(frame);
    } else {
      paint(settledRef.current, null);
    }

    return () => cancelAnimationFrame(raf);
  }, [design, packing, tick, animate]);

  if (packing.total === 0) {
    return (
      <p className="w-full px-1 py-5 text-center text-[0.625rem] text-white/50">
        No piece data yet
      </p>
    );
  }

  const frame = frameStyle(design);

  return (
    <div className={cn("relative inline-block p-1", frame.className)} style={frame.style}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

function frameStyle(design: TetrisDesignId): {
  className: string;
  style?: CSSProperties;
} {
  switch (design) {
    case "classic":
      return {
        className: "rounded-sm bg-[#0a0a12] ring-1 ring-white/10",
        style: {
          boxShadow: "inset 0 0 0 2px #1a1a28, inset 0 0 24px rgba(0,0,0,0.65)",
        },
      };
    case "glass":
      return {
        className:
          "rounded-xl bg-white/5 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      };
    case "neon":
      return {
        className: "rounded-md bg-black ring-1 ring-fuchsia-500/40",
        style: {
          boxShadow:
            "0 0 20px rgba(232,121,249,0.25), inset 0 0 30px rgba(34,211,238,0.08)",
        },
      };
    case "blueprint":
      return {
        className: "rounded-sm bg-[#0b1f3a] ring-1 ring-sky-400/30",
        style: {
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.07) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        },
      };
    case "soft":
      return {
        className: "rounded-2xl bg-zinc-950/40 ring-1 ring-white/10",
      };
  }
}

/** Ease-in (accelerate) like gravity. */
function easeInQuad(t: number): number {
  return t * t;
}

function paintPlayfield(
  canvas: HTMLCanvasElement,
  design: TetrisDesignId,
  packing: TetrisPacking,
  settled: number,
  falling: FallingState | null,
) {
  const { cols, rows, pieces } = packing;
  const maxW = 300;
  const maxH = 220;
  const pad = design === "classic" ? 4 : 3;
  const gap =
    design === "soft" ? 2 : design === "glass" ? 1.5 : design === "blueprint" ? 1 : 1;

  let cell = Math.floor(
    Math.min(
      (maxW - pad * 2 - (cols - 1) * gap) / cols,
      (maxH - pad * 2 - (rows - 1) * gap) / rows,
    ),
  );
  cell = Math.max(3, Math.min(cell, design === "soft" ? 18 : 16));
  const step = cell + gap;

  const w = pad * 2 + cols * cell + Math.max(0, cols - 1) * gap;
  const h = pad * 2 + rows * cell + Math.max(0, rows - 1) * gap;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Clip to well so falling pieces enter from the top edge
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  paintEmptyCells(ctx, design, cols, rows, cell, gap, pad);
  const colors = colorsFor(design);

  for (const p of pieces) {
    const isSettled = p.dropIndex < settled;
    const isFalling = falling?.pieceId === p.id;
    if (!isSettled && !isFalling) continue;

    let yOffset = 0;
    let alpha = 1;
    if (isFalling && falling) {
      const et = easeInQuad(falling.t);
      yOffset = -(1 - et) * falling.fallRows * step;
      alpha = 0.85 + 0.15 * et;
    }

    for (const cellPos of p.cells) {
      const x = pad + cellPos.c * step;
      const y = pad + cellPos.r * step + yOffset;
      // Skip blocks still fully above the well (keeps the top clean)
      if (y + cell < pad - 1) continue;
      paintBlock(ctx, design, x, y, cell, colors[p.kind], p.kind, alpha);
    }
  }

  ctx.restore();
}

function paintEmptyCells(
  ctx: CanvasRenderingContext2D,
  design: TetrisDesignId,
  cols: number,
  rows: number,
  cell: number,
  gap: number,
  pad: number,
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cell + gap);
      const y = pad + r * (cell + gap);
      switch (design) {
        case "classic":
          ctx.fillStyle = "#12121c";
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          break;
        case "glass":
          roundRectPath(ctx, x, y, cell, cell, Math.min(3, cell / 3));
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fill();
          break;
        case "neon":
          ctx.fillStyle = "#050508";
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = "rgba(34,211,238,0.08)";
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          break;
        case "blueprint":
          ctx.strokeStyle = "rgba(125,211,252,0.18)";
          ctx.lineWidth = 0.75;
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          break;
        case "soft":
          roundRectPath(ctx, x, y, cell, cell, Math.min(4, cell / 2.2));
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fill();
          break;
      }
    }
  }
}

function paintBlock(
  ctx: CanvasRenderingContext2D,
  design: TetrisDesignId,
  x: number,
  y: number,
  size: number,
  color: string,
  _kind: TetrominoKind,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  switch (design) {
    case "classic": {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
      // Bevel
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x, y, size, 2);
      ctx.fillRect(x, y, 2, size);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y + size - 2, size, 2);
      ctx.fillRect(x + size - 2, y, 2, size);
      // Inner
      const inset = Math.max(2, Math.floor(size * 0.22));
      if (size >= 6) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
      }
      break;
    }
    case "glass": {
      const r = Math.min(3.5, size / 3);
      roundRectPath(ctx, x, y, size, size, r);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.72;
      ctx.fill();
      ctx.globalAlpha = alpha;
      roundRectPath(ctx, x, y, size, size, r);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Specular
      roundRectPath(ctx, x + 1, y + 1, size - 2, size * 0.35, r * 0.6);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
      break;
    }
    case "neon": {
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(4, size * 0.55);
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + size * 0.25, y + size * 0.25, size * 0.5, size * 0.5);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      break;
    }
    case "blueprint": {
      ctx.fillStyle = "rgba(14,165,233,0.12)";
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);
      // Crosshair
      if (size >= 7) {
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + 2);
        ctx.lineTo(x + size / 2, y + size - 2);
        ctx.moveTo(x + 2, y + size / 2);
        ctx.lineTo(x + size - 2, y + size / 2);
        ctx.strokeStyle = "rgba(125,211,252,0.35)";
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
      break;
    }
    case "soft": {
      const r = Math.min(5, size / 2.1);
      roundRectPath(ctx, x, y, size, size, r);
      ctx.fillStyle = color;
      ctx.fill();
      roundRectPath(ctx, x + 1, y + 1, size - 2, size * 0.4, r * 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();
      roundRectPath(ctx, x, y, size, size, r);
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
