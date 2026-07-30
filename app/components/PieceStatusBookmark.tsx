import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

/** qBittorrent piece states */
const NOT_DOWNLOADED = 0;
const REQUESTED = 1;
const DOWNLOADED = 2;

const COLOR_EMPTY = "#ffffff";
const COLOR_EMPTY_STROKE = "rgba(15, 23, 42, 0.14)";
const COLOR_DOWNLOADING = "#3b82f6";
const COLOR_COMPLETE = "#22c55e";

interface PiecePayload {
  hash: string;
  pieces: number[];
  total: number;
  complete: number;
  downloading: number;
  missing: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  born: number;
}

/** `field` = production default (stats cell). `bookmark` = legacy ribbon — DEV only. */
export type PieceStatusVariant = "field" | "bookmark";

/** `float` = dense-glass Ring·Line (default). `legacy` = previous popover — DEV only. */
export type PiecePopupStyle = "float" | "legacy";

interface PieceStatusBookmarkProps {
  hash: string;
  className?: string;
  /** Production always uses `field`. `bookmark` only via Library Debug. */
  variant?: PieceStatusVariant;
  /** Production always uses `float`. `legacy` only via Library Debug. */
  popupStyle?: PiecePopupStyle;
}

/** Same dense-glass shell as torrent file viewer / FreeSpace popovers. */
const denseGlassPopup = cn(
  "w-auto max-w-[min(100vw-2rem,340px)] overflow-hidden p-1.5 text-white",
  "rounded-2xl border border-white/20 bg-zinc-900/80",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "ring-0",
);

const legacyPopup = cn(
  "w-auto max-w-[min(100vw-2rem,340px)] overflow-hidden rounded-xl border-0 p-0",
  "shadow-2xl ring-1 ring-black/8",
);

function pieceColor(state: number): string {
  if (state === DOWNLOADED) return COLOR_COMPLETE;
  if (state === REQUESTED) return COLOR_DOWNLOADING;
  return COLOR_EMPTY;
}

/**
 * qBittorrent often reports pieces as empty between request cycles
 * (white → blue → white → green). Sticky-keep "active" until complete.
 * Allow complete → empty on recheck/reset.
 */
function mergePieceState(prev: number | undefined, next: number): number {
  if (next === DOWNLOADED) return DOWNLOADED;
  if (next === REQUESTED) return REQUESTED;
  if (prev === DOWNLOADED) return NOT_DOWNLOADED;
  if (prev === REQUESTED) return REQUESTED;
  return NOT_DOWNLOADED;
}

function stickyPieces(prev: number[] | null, raw: number[]): number[] {
  if (!prev || prev.length !== raw.length) return raw.slice();
  const out = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = mergePieceState(prev[i], raw[i]);
  }
  return out;
}

export default function PieceStatusBookmark({
  hash,
  className,
  variant = "field",
  popupStyle = "float",
}: PieceStatusBookmarkProps) {
  const effectiveVariant: PieceStatusVariant = import.meta.env.DEV
    ? variant
    : "field";
  const isField = effectiveVariant === "field";
  const effectivePopup: PiecePopupStyle = import.meta.env.DEV
    ? popupStyle
    : "float";
  const useFloat = effectivePopup === "float";

  const [data, setData] = useState<PiecePayload | null>(null);
  const [displayPieces, setDisplayPieces] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);

  const prevDisplayRef = useRef<number[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparkIdRef = useRef(0);
  const layoutRef = useRef({ cols: 0, cell: 0, gap: 1, pad: 8 });

  useEffect(() => {
    setData(null);
    setDisplayPieces(null);
    prevDisplayRef.current = null;
    setSparks([]);
    setError(null);
  }, [hash]);

  const fetchPieces = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/torrent_pieces?hash=${encodeURIComponent(hash)}`,
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Failed to load pieces");
        return;
      }
      const payload = json as PiecePayload;
      const display = stickyPieces(prevDisplayRef.current, payload.pieces);
      setData(payload);
      setDisplayPieces(display);
      setError(null);

      const prev = prevDisplayRef.current;
      if (prev && display.length === prev.length) {
        const newlyDone: number[] = [];
        for (let i = 0; i < display.length; i++) {
          if (display[i] === DOWNLOADED && prev[i] !== DOWNLOADED) {
            newlyDone.push(i);
          }
        }
        if (newlyDone.length > 0) {
          const { cols, cell, gap, pad } = layoutRef.current;
          if (cols > 0) {
            const now = performance.now();
            // Cap sparks so bursts stay calm under heavy completion
            const nextSparks: Spark[] = newlyDone.slice(0, 10).map((idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              return {
                id: ++sparkIdRef.current,
                x: pad + col * (cell + gap) + cell / 2,
                y: pad + row * (cell + gap) + cell / 2,
                born: now,
              };
            });
            setSparks((s) => [...s, ...nextSparks].slice(-16));
          }
        }
      }
      prevDisplayRef.current = display;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pieces");
    } finally {
      setLoading(false);
    }
  }, [hash]);

  const warm = useCallback(() => {
    if (data || loading) return;
    setLoading(true);
    fetchPieces();
  }, [data, loading, fetchPieces]);

  useEffect(() => {
    if (!open) return;
    if (!data) setLoading(true);
    fetchPieces();
    const id = setInterval(fetchPieces, 1000);
    return () => clearInterval(id);
  }, [open, hash, fetchPieces]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayPieces?.length || !open) return;

    const pieces = displayPieces;
    const total = pieces.length;
    const maxW = useFloat ? 300 : 292;
    const maxH = useFloat ? 188 : 168;
    const pad = useFloat ? 2 : 8;
    const gap = total > 2500 ? 0 : 1;
    let cell = total > 4000 ? 3 : total > 1500 ? 4 : total > 600 ? 5 : 6;
    let cols = Math.max(1, Math.floor((maxW - pad * 2) / (cell + gap)));
    let rows = Math.ceil(total / cols);
    while (rows * (cell + gap) + pad * 2 > maxH && cell > 2) {
      cell -= 1;
      cols = Math.max(1, Math.floor((maxW - pad * 2) / (cell + gap)));
      rows = Math.ceil(total / cols);
    }
    const w = pad * 2 + cols * cell + Math.max(0, cols - 1) * gap;
    const h = pad * 2 + rows * cell + Math.max(0, rows - 1) * gap;

    layoutRef.current = { cols, cell, gap, pad };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!useFloat) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.04)";
      roundRect(ctx, 0, 0, w, h, 8);
      ctx.fill();
    }

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cell + gap);
      const y = pad + row * (cell + gap);
      const state = pieces[i];
      ctx.fillStyle = pieceColor(state);
      if (cell >= 4) {
        const r = Math.min(1.25, cell / 4);
        roundRect(ctx, x, y, cell, cell, r);
        ctx.fill();
        if (state === NOT_DOWNLOADED) {
          ctx.strokeStyle = COLOR_EMPTY_STROKE;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }, [displayPieces, open, useFloat]);

  useEffect(() => {
    if (sparks.length === 0) return;
    const id = setInterval(() => {
      const now = performance.now();
      setSparks((s) => s.filter((sp) => now - sp.born < 500));
    }, 120);
    return () => clearInterval(id);
  }, [sparks.length]);

  const pct =
    data && data.total > 0
      ? Math.round((data.complete / data.total) * 100)
      : null;

  const fieldMosaic = displayPieces
    ? samplePreview(displayPieces, 8)
    : [2, 2, 1, 0, 2, 0, 1, 0];

  const ribbonMosaic = displayPieces
    ? samplePreview(displayPieces, 9)
    : [0, 0, 2, 0, 1, 0, 2, 0, 0];

  const ariaLabel =
    data != null
      ? `Pieces ${data.complete.toLocaleString()} of ${data.total.toLocaleString()} complete`
      : "Piece status";

  return (
    <HoverCard open={open} onOpenChange={(next) => setOpen(next)}>
      <HoverCardTrigger
        delay={80}
        closeDelay={100}
        onMouseEnter={warm}
        onFocus={warm}
        className={cn(
          isField
            ? "inline-flex min-w-0 cursor-default items-center gap-1.5 text-xs outline-none transition-colors hover:text-foreground select-none"
            : "piece-ribbon group outline-none cursor-default select-none",
          className,
        )}
        aria-label={ariaLabel}
      >
        {isField ? (
          <>
            <span
              className="grid w-5 shrink-0 grid-cols-4 gap-px rounded-[0.125rem] p-px ring-1 ring-black/10 dark:ring-white/10"
              aria-hidden
            >
              {fieldMosaic.map((s, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[0.03125rem]"
                  style={{
                    backgroundColor:
                      s === NOT_DOWNLOADED ? "#e8eaed" : pieceColor(s),
                  }}
                />
              ))}
            </span>
            <span className="truncate">pieces</span>
            <ChevronDownIcon className="size-2.5 shrink-0 opacity-60" />
          </>
        ) : (
          <>
            <span className="piece-ribbon-body">
              <span className="piece-ribbon-mosaic" aria-hidden>
                {ribbonMosaic.map((s, i) => (
                  <span
                    key={i}
                    className="piece-ribbon-cell"
                    style={{ backgroundColor: pieceColor(s) }}
                    data-state={s}
                  />
                ))}
              </span>
              <span className="piece-ribbon-label">
                {pct != null ? (
                  <span className="tabular-nums">{pct}%</span>
                ) : (
                  <span className="opacity-60">···</span>
                )}
              </span>
            </span>
            <span className="piece-ribbon-fold" aria-hidden />
          </>
        )}
      </HoverCardTrigger>

      <HoverCardContent
        side="bottom"
        align={isField ? "start" : "end"}
        sideOffset={8}
        className={useFloat ? denseGlassPopup : legacyPopup}
      >
        {useFloat ? (
          <FloatPiecesBody
            data={data}
            loading={loading}
            error={error}
            canvasRef={canvasRef}
            sparks={sparks}
          />
        ) : (
          <LegacyPiecesBody
            data={data}
            loading={loading}
            error={error}
            pct={pct}
            canvasRef={canvasRef}
            sparks={sparks}
          />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Ring·Line float — dense glass, no ring/%, mosaic floats on the shell. */
function FloatPiecesBody({
  data,
  loading,
  error,
  canvasRef,
  sparks,
}: {
  data: PiecePayload | null;
  loading: boolean;
  error: string | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sparks: Spark[];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 px-1.5 pt-0.5 pb-1">
        <div className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
          Pieces
        </div>
        <div className="text-[0.5625rem] tabular-nums text-white/40">
          {data
            ? `${data.complete.toLocaleString()} of ${data.total.toLocaleString()}`
            : loading
              ? "Loading…"
              : "—"}
        </div>
      </div>

      <div className="relative flex justify-center px-0.5">
        {error ? (
          <p className="w-full px-1 py-5 text-center text-[0.625rem] text-red-400">
            {error}
          </p>
        ) : !data ? (
          <div className="flex h-32 w-72 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        ) : data.total === 0 ? (
          <p className="w-full px-1 py-5 text-center text-[0.625rem] text-white/50">
            No piece data yet
          </p>
        ) : (
          <div className="relative inline-block">
            <canvas ref={canvasRef} className="block" />
            {sparks.map((sp) => (
              <span
                key={sp.id}
                className="piece-spark pointer-events-none absolute"
                style={{ left: sp.x, top: sp.y }}
              >
                <span className="piece-spark-burst" />
              </span>
            ))}
          </div>
        )}
      </div>

      {data && data.total > 0 ? (
        <div className="px-1.5 pt-1 pb-0.5 text-center text-[0.5625rem] tabular-nums text-white/40">
          <span className="text-emerald-400">
            {data.complete.toLocaleString()}
          </span>
          <span className="mx-1.5 text-white/20">·</span>
          <span className="text-sky-400">
            {data.downloading.toLocaleString()}
          </span>
          <span className="mx-1.5 text-white/20">·</span>
          <span>{data.missing.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Previous framed popover — DEV rollback only. */
function LegacyPiecesBody({
  data,
  loading,
  error,
  pct,
  canvasRef,
  sparks,
}: {
  data: PiecePayload | null;
  loading: boolean;
  error: string | null;
  pct: number | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sparks: Spark[];
}) {
  return (
    <div className="bg-popover text-popover-foreground">
      <div className="flex items-start justify-between gap-4 px-3.5 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-[0.8125rem] font-semibold tracking-tight">
            Pieces
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            {data
              ? `${data.complete.toLocaleString()} of ${data.total.toLocaleString()} complete`
              : loading
                ? "Loading map…"
                : "—"}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[0.625rem] text-muted-foreground">
            <Legend swatch={COLOR_EMPTY} border label="Empty" />
            <Legend swatch={COLOR_DOWNLOADING} label="Active" />
            <Legend swatch={COLOR_COMPLETE} label="Done" />
          </div>
        </div>
      </div>

      {data && data.total > 0 && (
        <div className="mx-3.5 mb-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
      )}

      <div className="relative flex justify-center px-3 pb-3">
        {error ? (
          <p className="w-full rounded-lg bg-destructive/5 px-3 py-8 text-center text-xs text-destructive">
            {error}
          </p>
        ) : !data ? (
          <div className="flex h-36 w-72 items-center justify-center rounded-lg bg-muted/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground/60" />
          </div>
        ) : data.total === 0 ? (
          <p className="w-full rounded-lg bg-muted/40 px-3 py-8 text-center text-xs text-muted-foreground">
            No piece data yet
          </p>
        ) : (
          <div className="relative inline-block overflow-hidden rounded-lg shadow-inner ring-1 ring-black/5">
            <canvas ref={canvasRef} className="block" />
            {sparks.map((sp) => (
              <span
                key={sp.id}
                className="piece-spark pointer-events-none absolute"
                style={{ left: sp.x, top: sp.y }}
              >
                <span className="piece-spark-burst" />
              </span>
            ))}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="grid grid-cols-3 border-t bg-muted/30 text-center text-[0.6875rem]">
          <Stat
            value={data.complete}
            label="done"
            className="text-emerald-600"
          />
          <Stat
            value={data.downloading}
            label="active"
            className="text-blue-500"
          />
          <Stat
            value={data.missing}
            label="empty"
            className="text-foreground/60"
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className="px-2 py-2.5">
      <div className={cn("font-semibold tabular-nums leading-none", className)}>
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[0.625rem] text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  border,
}: {
  swatch: string;
  label: string;
  border?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block size-2 rounded-[0.125rem]"
        style={{
          backgroundColor: swatch,
          boxShadow: border
            ? `inset 0 0 0 0.5px ${COLOR_EMPTY_STROKE}`
            : undefined,
        }}
      />
      {label}
    </span>
  );
}

function samplePreview(pieces: number[], n: number): number[] {
  if (pieces.length === 0) return Array(n).fill(0);
  if (pieces.length <= n) {
    const out = pieces.slice();
    while (out.length < n) out.push(0);
    return out;
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor((i / n) * pieces.length);
    out.push(pieces[idx] ?? 0);
  }
  return out;
}

function roundRect(
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
