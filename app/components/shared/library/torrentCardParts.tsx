import {
  formatDuration,
  intervalToDuration,
  formatDistanceToNow,
} from "date-fns";
import {
  ClockIcon,
  MoreHorizontalIcon,
  FilmIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Trash2Icon,
  FolderXIcon,
  SproutIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import {
  normalizeTorrentFiles,
  TorrentFilesHoverCard,
  type TorrentFilesViewerStyle,
} from "@/components/shared/TorrentFilesHoverCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { imdbIdFromTags, isImdbAssumedFromTags } from "@/lib/imdb";
import { softWashFill, useDominantColor } from "@/lib/dominant-color";
import type { TorrentInfo, FileInfo, ImdbMeta } from "@/lib/types";
import PieceStatusBookmark, {
  type PiecePopupStyle,
  type PieceStatusVariant,
} from "@/components/shared/PieceStatusBookmark";

function isPausedState(state: string) {
  const s = String(state).toLowerCase();
  return s.includes("paused") || s.includes("stopped");
}

function isCompleted(t: TorrentInfo) {
  return (t.progress || 0) >= 1 || String(t.state).toLowerCase().includes("up");
}

function statusLabel(t: TorrentInfo): { text: string; className: string } {
  const s = String(t.state);
  const lower = s.toLowerCase();
  if (isPausedState(s)) {
    return {
      text: isCompleted(t) ? "Finished" : "Paused",
      className: "bg-muted text-muted-foreground",
    };
  }
  if (
    lower.includes("uploading") ||
    lower.includes("stalledup") ||
    lower === "up" ||
    lower.includes("forcedup")
  ) {
    return { text: "Seeding", className: "bg-sky-500/15 text-sky-600" };
  }
  if (isCompleted(t)) {
    return {
      text: "Completed",
      className: "bg-emerald-500/15 text-emerald-600",
    };
  }
  if (lower.includes("downloading") || lower.includes("forceddl")) {
    return {
      text: "Downloading",
      className: "bg-sky-500/15 text-sky-600",
    };
  }
  if (lower.includes("stalleddl") || lower.includes("stalled")) {
    return { text: "Stalled", className: "bg-orange-500/15 text-orange-600" };
  }
  if (lower.includes("queued")) {
    return { text: "Queued", className: "bg-violet-500/15 text-violet-600" };
  }
  if (lower.includes("check") || lower.includes("moving")) {
    return { text: s, className: "bg-blue-500/15 text-blue-600" };
  }
  if (lower.includes("error") || lower.includes("missing")) {
    return { text: s, className: "bg-red-500/15 text-red-600" };
  }
  return { text: s, className: "bg-muted text-muted-foreground" };
}

export type CardModel = {
  torrent: TorrentInfo;
  progress: number;
  paused: boolean;
  complete: boolean;
  status: { text: string; className: string };
  imdbId: string | null;
  imdbAssumed: boolean;
  meta: ImdbMeta | null | undefined;
  eta: string | null;
  added: string | null;
  files: FileInfo[] | undefined;
  isLoadingFiles: boolean;
  displayTitle: string;
  formatBytes: (bytes: number) => string;
  onFetchFiles: () => void;
  onDownloadFile: (file: string) => void;
  onPause: () => void;
  onResume: () => void;
  onRecheck: () => void;
  onReannounce: () => void;
  onDelete: (withFiles: boolean) => void;
};

export function buildModel(props: LibraryTorrentCardProps): CardModel {
  const { torrent: t, meta, files, isLoadingFiles, formatBytes } = props;
  const progress = Math.round((t.progress || 0) * 100);
  const paused = isPausedState(t.state);
  const complete = isCompleted(t);
  const status = statusLabel(t);
  const imdbId = imdbIdFromTags(t.tags);
  const imdbAssumed = isImdbAssumedFromTags(t.tags);
  const eta =
    !complete && t.eta > 0 && t.eta < 8640000
      ? formatDuration(intervalToDuration({ start: 0, end: t.eta * 1000 }))
      : null;
  const added =
    t.added_on > 0
      ? formatDistanceToNow(new Date(t.added_on * 1000), { addSuffix: true })
      : null;

  return {
    torrent: t,
    progress,
    paused,
    complete,
    status,
    imdbId,
    imdbAssumed,
    meta,
    eta,
    added,
    files,
    isLoadingFiles,
    displayTitle: meta?.title || t.name,
    formatBytes,
    onFetchFiles: props.onFetchFiles,
    onDownloadFile: props.onDownloadFile,
    onPause: props.onPause,
    onResume: props.onResume,
    onRecheck: props.onRecheck,
    onReannounce: props.onReannounce,
    onDelete: props.onDelete,
  };
}

export function Cover({
  model,
  float,
  className,
}: {
  model: CardModel;
  /** Padded floating poster that doesn't stretch the card height. */
  float?: boolean;
  className?: string;
}) {
  const { meta, imdbId } = model;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        float
          ? cn(
              "aspect-2/3 rounded-xl",
              "shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-white/15",
            )
          : "w-[7.25rem] self-stretch sm:w-32",
        className,
      )}
    >
      {meta?.image ? (
        <img
          src={meta.image}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground/50">
          <FilmIcon className={float ? "size-6" : "size-8"} />
          {imdbId ? (
            <span className="text-[0.5625rem] font-mono opacity-70">
              {imdbId}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function TitleBlock({
  model,
  padForBookmark,
}: {
  model: CardModel;
  padForBookmark?: boolean;
}) {
  const { displayTitle, meta, torrent: t } = model;
  return (
    <div className={cn("mb-1.5 min-w-0", padForBookmark && "pr-9")}>
      <div
        className="font-semibold text-sm leading-tight truncate"
        title={displayTitle}
      >
        {displayTitle}
      </div>
      {(meta?.title || meta?.year) && (
        <div
          className="text-[0.625rem] text-muted-foreground truncate mt-0.5"
          title={t.name}
        >
          {meta?.year ? `${meta.year} · ` : ""}
          {t.name}
        </div>
      )}
      {!meta?.title && t.save_path && (
        <div
          className="text-[0.625rem] text-muted-foreground/70 font-mono truncate mt-0.5"
          title={t.save_path}
        >
          {t.save_path}
        </div>
      )}
    </div>
  );
}

export function StatusChips({
  model,
  glass,
}: {
  model: CardModel;
  glass?: boolean;
}) {
  const { status, imdbId, imdbAssumed } = model;
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1">
      <span
        className={cn(
          "inline-flex h-4 items-center px-1.5 text-[0.5625rem] font-medium",
          glass ? "rounded-full" : "rounded-sm",
          glass
            ? status.text === "Downloading"
              ? "bg-sky-500/20 text-sky-300"
              : status.text === "Seeding" || status.text === "Completed"
                ? "bg-emerald-500/20 text-emerald-300"
                : status.text === "Paused" || status.text === "Finished"
                  ? "bg-white/10 text-white/50"
                  : status.className
            : status.className,
        )}
      >
        {status.text}
      </span>
      {imdbId ? (
        <a
          href={`https://www.imdb.com/title/${imdbId}/`}
          target="_blank"
          rel="noreferrer"
          title={
            imdbAssumed
              ? "This torrent didn’t say which show it is — we used your search."
              : undefined
          }
          className="inline-flex h-3.5 items-stretch"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src="/imdb-logo.svg"
            alt="IMDb"
            className="relative z-[1] h-full w-auto select-none"
            draggable={false}
          />
          {imdbAssumed ? (
            <span
              className="-ml-[3px] inline-flex items-center justify-center gap-0 rounded-r-[0.28rem] bg-[#f6c700] pr-1 text-[#141414]"
              aria-label="Assumed"
            >
              <span
                className="mx-0.5 h-[55%] w-px bg-[#141414]/25"
                aria-hidden
              />
              <TriangleAlertIcon
                className="size-2.5 shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
            </span>
          ) : null}
        </a>
      ) : null}
    </div>
  );
}

function fmtRate(bytesPerSec: number, formatBytes: (n: number) => string) {
  if (!bytesPerSec || bytesPerSec < 1) return "0 B/s";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function TransferSpeed({
  dlspeed,
  upspeed,
  complete,
  formatBytes,
}: {
  dlspeed: number;
  upspeed: number;
  complete: boolean;
  formatBytes: (n: number) => string;
}) {
  const downTitle = fmtRate(dlspeed, formatBytes);
  const upTitle = fmtRate(upspeed, formatBytes);

  return (
    <div
      className="flex min-w-0 items-center gap-2 text-[0.625rem] tabular-nums leading-none"
      title={complete ? `↑ ${upTitle}` : `↓ ${downTitle} · ↑ ${upTitle}`}
    >
      {!complete ? (
        <span className="inline-flex min-w-0 items-center gap-0.5 text-emerald-500">
          <span className="opacity-70">↓</span>
          <span className="truncate font-semibold">{downTitle}</span>
        </span>
      ) : null}
      <span className="inline-flex min-w-0 items-center gap-0.5 text-sky-500">
        <span className="opacity-70">↑</span>
        <span className="truncate font-semibold">{upTitle}</span>
      </span>
    </div>
  );
}

export function PeersField({
  torrent: t,
}: {
  torrent: CardModel["torrent"];
}) {
  return (
    <div
      className="inline-flex h-4 items-center gap-1 text-[0.625rem] tabular-nums"
      title={`${t.num_seeds ?? 0} seeds · ${t.num_leechs ?? t.num_leechers ?? 0} leeches`}
    >
      <span className="inline-flex items-center gap-0.5 text-emerald-500">
        <SproutIcon className="size-3 shrink-0" />
        <span className="font-semibold">{t.num_seeds ?? 0}</span>
      </span>
      <span className="text-muted-foreground/40">/</span>
      <span className="inline-flex items-center gap-0.5 text-red-500">
        <UsersIcon className="size-3 shrink-0" />
        <span className="font-semibold">
          {t.num_leechs ?? t.num_leechers ?? 0}
        </span>
      </span>
    </div>
  );
}

export function StatsGrid({
  model,
  filesViewerStyle,
  piecesVariant,
  piecesPopupStyle,
}: {
  model: CardModel;
  filesViewerStyle: TorrentFilesViewerStyle;
  piecesVariant: PieceStatusVariant;
  piecesPopupStyle: PiecePopupStyle;
}) {
  const {
    torrent: t,
    added,
    eta,
    files,
    isLoadingFiles,
    formatBytes,
    onFetchFiles,
    onDownloadFile,
    complete,
  } = model;

  const fieldPieces = piecesVariant === "field";

  return (
    <div className="mb-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1">
        <ClockIcon className="size-3 shrink-0" />
        <span className="truncate" title={added || undefined}>
          {added || "—"}
        </span>
      </div>

      <TorrentFilesHoverCard
        fileCount={files?.length}
        loading={isLoadingFiles}
        awaitingFiles={files == null}
        files={normalizeTorrentFiles(files ?? [])}
        onHover={onFetchFiles}
        formatBytes={formatBytes}
        onDownloadFile={onDownloadFile}
        triggerClassName="min-w-0"
        viewerStyle={filesViewerStyle}
      />

      <div className="truncate tabular-nums">{formatBytes(t.size || 0)}</div>

      {fieldPieces ? (
        <PieceStatusBookmark
          hash={t.hash}
          variant="field"
          popupStyle={piecesPopupStyle}
        />
      ) : complete ? (
        <div aria-hidden className="min-h-4" />
      ) : (
        <PeersField torrent={t} />
      )}

      {fieldPieces && !complete ? (
        <>
          <PeersField torrent={t} />
          <div aria-hidden className="min-h-4" />
        </>
      ) : null}

      <div className="col-span-2 min-w-0">
        <TransferSpeed
          dlspeed={t.dlspeed || 0}
          upspeed={t.upspeed || 0}
          complete={complete}
          formatBytes={formatBytes}
        />
      </div>

      {complete ? null : (
        <div className="col-span-2 truncate" title={eta || undefined}>
          ETA {eta || "—"}
        </div>
      )}
    </div>
  );
}

export function ActionRow({
  model,
  className,
  dominantColor,
  progressColorMode,
  progressChrome,
  completeAction,
  seedOffStyle,
}: {
  model: CardModel;
  className?: string;
  dominantColor: string | null;
  progressColorMode: "cover" | "original";
  progressChrome: "frosted" | "flat";
  completeAction: "logo" | "capsule";
  seedOffStyle: "red" | "muted";
}) {
  const {
    paused,
    complete,
    progress,
    torrent,
    imdbId,
    onPause,
    onResume,
    onReannounce,
    onRecheck,
    onDelete,
  } = model;

  const copyHash = () => {
    void navigator.clipboard.writeText(torrent.hash);
  };

  const openImdb = () => {
    if (!imdbId) return;
    window.open(`https://www.imdb.com/title/${imdbId}/`, "_blank", "noreferrer");
  };

  const action = paused
    ? {
        label: complete ? "Seed" : "Resume",
        Icon: PlayIcon,
        onClick: onResume,
        tone: complete ? ("seed" as const) : ("resume" as const),
      }
    : {
        label: "Pause",
        Icon: PauseIcon,
        onClick: onPause,
        tone: "pause" as const,
      };

  const frosted = progressChrome === "frosted";
  const useSeedLogo = complete && completeAction === "logo";
  const menuItemClass = frosted
    ? "rounded-lg focus:bg-white/12 focus:text-foreground data-[variant=destructive]:focus:bg-red-500/15"
    : undefined;
  const menuSepClass = frosted ? "bg-white/15" : undefined;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {useSeedLogo ? (
        <>
          <div className="min-w-0 flex-1" />
          <SeedLogoButton
            seeding={!paused}
            frosted={frosted}
            seedOffStyle={seedOffStyle}
            onToggle={paused ? onResume : onPause}
          />
        </>
      ) : (
        <MainActionButton
          action={action}
          progress={progress}
          complete={complete}
          paused={paused}
          dlspeed={torrent.dlspeed || 0}
          upspeed={torrent.upspeed || 0}
          dominantColor={dominantColor}
          progressColorMode={progressColorMode}
          progressChrome={progressChrome}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Torrent actions"
          className={cn(
            "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            frosted
              ? cn(
                  "border border-white/20 bg-white/10 text-foreground/85",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.25)]",
                  "backdrop-blur-xl backdrop-saturate-150",
                  "hover:bg-white/14 hover:text-foreground",
                )
              : "border border-white/10 bg-white/4 text-white/60 hover:bg-white/8 hover:text-foreground",
          )}
        >
          <MoreHorizontalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={cn(
            "w-auto min-w-52",
            frosted &&
              cn(
                "rounded-xl border border-white/20 bg-white/10 p-1.5 text-foreground",
                "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)]",
                "ring-0 backdrop-blur-2xl backdrop-saturate-150",
              ),
          )}
        >
          {paused ? (
            <DropdownMenuItem onClick={onResume} className={menuItemClass}>
              <PlayIcon className="size-4 text-muted-foreground" />
              <span>{complete ? "Start seeding" : "Resume"}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onPause} className={menuItemClass}>
              <PauseIcon className="size-4 text-muted-foreground" />
              <span>Pause</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className={menuSepClass} />
          <DropdownMenuItem onClick={onReannounce} className={menuItemClass}>
            <RefreshCwIcon className="size-4 text-muted-foreground" />
            <span>Reannounce</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRecheck} className={menuItemClass}>
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
            <span>Force recheck</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyHash} className={menuItemClass}>
            <CopyIcon className="size-4 text-muted-foreground" />
            <span>Copy info hash</span>
          </DropdownMenuItem>
          {imdbId ? (
            <DropdownMenuItem onClick={openImdb} className={menuItemClass}>
              <ExternalLinkIcon className="size-4 text-muted-foreground" />
              <span>Open on IMDb</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator className={menuSepClass} />
          <DropdownMenuItem
            onClick={() => onDelete(false)}
            className={menuItemClass}
          >
            <Trash2Icon className="size-4 text-muted-foreground" />
            <span>Delete torrent</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(true)}
            variant="destructive"
            className={menuItemClass}
          >
            <FolderXIcon className="size-4" />
            <span>Delete with files</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** L1 — frosted circle Seed logo (replaces progress when complete) */
function SeedLogoButton({
  seeding,
  frosted,
  seedOffStyle,
  onToggle,
}: {
  seeding: boolean;
  frosted: boolean;
  seedOffStyle: "red" | "muted";
  onToggle: () => void;
}) {
  const redOff = seedOffStyle === "red";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={seeding}
      aria-label={seeding ? "Stop seeding" : "Start seeding"}
      title={seeding ? "Seeding" : "Seed off"}
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        frosted
          ? cn(
              "border border-white/20 bg-white/10",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.25)]",
              "backdrop-blur-xl backdrop-saturate-150",
              seeding
                ? "text-emerald-100 hover:bg-white/14"
                : redOff
                  ? "text-red-400 hover:bg-white/14"
                  : "text-foreground/70 hover:bg-white/14 hover:text-foreground",
            )
          : seeding
            ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            : redOff
              ? "border border-red-500/25 bg-red-500/15 text-red-400 hover:bg-red-500/25"
              : "border border-white/10 bg-white/4 text-white/60 hover:bg-white/8 hover:text-foreground",
      )}
    >
      {frosted && seeding ? (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "color-mix(in oklab, #34d399 45%, transparent)",
          }}
        />
      ) : null}
      {frosted && !seeding && redOff ? (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "color-mix(in oklab, #ef4444 18%, transparent)",
          }}
        />
      ) : null}
      <SproutIcon className="relative z-10 size-3.5" />
    </button>
  );
}

type MainAction = {
  label: string;
  Icon: typeof PlayIcon;
  onClick: () => void;
  tone: "resume" | "seed" | "pause";
};

type SparkleParticle = {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
  /** performance.now() — particle is idle until this time (smooths speed-up bursts). */
  bornAt: number;
};

/**
 * 10 KB/s → 1 particle.
 * Full-button canvas: spawn at the capsule’s literal right edge, drift left,
 * deposit at the progress tip (or near-left when complete/seeding).
 * New particles (count up / recycle) get a small random stagger so flow stays smooth.
 */
function ProgressSparkles({
  count,
  flowing,
  progressPct,
}: {
  count: number;
  flowing: boolean;
  /** 0–100 fill tip; 100 = complete/seeding (flow across pill, recycle near left). */
  progressPct: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const countRef = useRef(count);
  const flowingRef = useRef(flowing);
  const progressRef = useRef(progressPct);
  countRef.current = count;
  flowingRef.current = flowing;
  progressRef.current = progressPct;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tipX = (w: number) => {
      const pct = Math.max(0, Math.min(100, progressRef.current));
      if (pct >= 100) return w * 0.08;
      return w * (pct / 100);
    };

    const spawn = (
      w: number,
      h: number,
      atRightEdge: boolean,
      bornAt: number,
    ): SparkleParticle => {
      const tip = tipX(w);
      const span = Math.max(w - tip, 1);
      return {
        x: atRightEdge
          ? w + Math.random() * 2
          : tip + Math.random() * span,
        y: Math.random() * Math.max(h, 1),
        r: 0.55 + Math.random() * 1.05,
        speed: 28 + Math.random() * 55,
        alpha: 0.12 + Math.random() * 0.18,
        bornAt,
      };
    };

    const latestBornAt = (arr: SparkleParticle[], now: number) => {
      let latest = now;
      for (const p of arr) if (p.bornAt > latest) latest = p.bornAt;
      return latest;
    };

    /** Grow/shrink toward target; new ones queue with staggered delays (no burst). */
    const syncParticles = (w: number, h: number, now: number) => {
      const target = Math.max(0, Math.floor(countRef.current));
      const arr = particlesRef.current;

      if (arr.length > target) {
        // Drop not-yet-visible first so the stream doesn’t pop mid-flight
        arr.sort((a, b) => b.bornAt - a.bornAt);
        arr.length = target;
      }

      if (arr.length < target) {
        const need = target - arr.length;
        let t = latestBornAt(arr, now);
        for (let i = 0; i < need; i++) {
          t += 1 + Math.random() * 9; // ~1–10ms between each new particle
          arr.push(spawn(w, h, true, t));
        }
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.max(0, Math.floor(countRef.current));
      const arr = particlesRef.current;
      const now = performance.now();
      arr.length = 0;
      // Bootstrap already mid-flight (visible immediately)
      for (let i = 0; i < target; i++) arr.push(spawn(w, h, false, now));
    };

    const draw = (now: number) => {
      const parent = canvas.parentElement;
      if (!parent) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      syncParticles(w, h, now);
      ctx.clearRect(0, 0, w, h);

      // Clip to pill shape in-canvas — Safari often fails CSS overflow clip
      // when a parent also uses backdrop-filter.
      ctx.save();
      ctx.beginPath();
      const radius = h / 2;
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(0, 0, w, h, radius);
      } else {
        // Fallback for older WebKit without roundRect
        ctx.moveTo(radius, 0);
        ctx.arcTo(w, 0, w, h, radius);
        ctx.arcTo(w, h, 0, h, radius);
        ctx.arcTo(0, h, 0, 0, radius);
        ctx.arcTo(0, 0, w, 0, radius);
        ctx.closePath();
      }
      ctx.clip();

      const move = flowingRef.current && !reduceMotion;
      const deposit = tipX(w);
      const travel = Math.max(w - deposit, 1);

      for (const p of particlesRef.current) {
        if (now < p.bornAt) continue;

        if (move) {
          p.x -= p.speed * dt;
          if (p.x <= deposit) {
            // Tiny random delay before re-entering from the right
            Object.assign(
              p,
              spawn(w, h, true, now + 1 + Math.random() * 9),
            );
            continue;
          }
        }

        const glow = Math.max(0, Math.min(1, (p.x - deposit) / travel));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${p.alpha * (0.2 + 0.45 * glow)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 mix-blend-soft-light",
        count <= 0 && "invisible",
      )}
    />
  );
}

/** Capsule control — progress fills the pill; % sits naturally on the right. */
function MainActionButton({
  action,
  progress,
  complete,
  paused,
  dlspeed,
  upspeed,
  dominantColor,
  progressColorMode,
  progressChrome,
}: {
  action: MainAction;
  progress: number;
  complete: boolean;
  paused: boolean;
  dlspeed: number;
  upspeed: number;
  dominantColor: string | null;
  progressColorMode: "cover" | "original";
  progressChrome: "frosted" | "flat";
}) {
  const { label, Icon, onClick, tone } = action;
  const pct = Math.min(100, Math.max(0, progress));
  const showProgress = !complete;
  const speed = complete ? upspeed : dlspeed;
  const particleCount = Math.floor(Math.max(0, speed) / (10 * 1024));
  const sparkleFlowing = !paused && particleCount > 0;
  const useCoverColor = progressColorMode === "cover";
  const frosted = progressChrome === "frosted";

  const coverFill =
    useCoverColor && dominantColor ? softWashFill(dominantColor) : null;
  const completedFill = "color-mix(in oklab, #34d399 45%, transparent)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={showProgress ? `${label}, ${pct}%` : label}
      className={cn(
        "relative flex h-8 flex-1 cursor-pointer items-center overflow-hidden rounded-full transition-colors",
        frosted
          ? cn(
              "border border-white/20 bg-white/10 text-foreground/90",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.25)]",
              "backdrop-blur-xl backdrop-saturate-150",
              complete && "text-emerald-100",
            )
          : complete
            ? useCoverColor
              ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              : tone === "seed"
                ? "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
                : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            : "bg-white/6 text-foreground/85 hover:bg-white/9",
      )}
    >
      {showProgress ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-300 ease-out",
            !coverFill && tone === "resume" && "bg-emerald-500/35",
            !coverFill && tone === "pause" && "bg-sky-500/25",
            !coverFill && tone === "seed" && "bg-sky-500/30",
          )}
          style={{
            width: `${pct}%`,
            ...(coverFill ? { background: coverFill } : null),
          }}
        />
      ) : frosted || useCoverColor ? (
        <span
          aria-hidden
          className={cn("absolute inset-0", !frosted && "bg-emerald-400/35")}
          style={frosted ? { background: completedFill } : undefined}
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <ProgressSparkles
          count={particleCount}
          flowing={sparkleFlowing}
          progressPct={complete ? 100 : pct}
        />
      </span>
      <span className="relative z-10 flex w-full items-center px-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.08em] uppercase">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        {showProgress ? (
          <span className="ml-auto pl-2 text-[0.75rem] font-medium tabular-nums tracking-normal text-foreground/70">
            {pct}
            <span className="text-[0.625rem] text-foreground/45">%</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

export interface LibraryTorrentCardProps {
  torrent: TorrentInfo;
  meta: ImdbMeta | null | undefined;
  files: FileInfo[] | undefined;
  isLoadingFiles: boolean;
  formatBytes: (bytes: number) => string;
  onFetchFiles: () => void;
  onDownloadFile: (file: string) => void;
  onPause: () => void;
  onResume: () => void;
  onRecheck: () => void;
  onReannounce: () => void;
  onDelete: (withFiles: boolean) => void;
  onMouseEnter: () => void;
  /** `glass` = Soft Island frosted card — only via Library Debug flag */
  variant?: "glass" | "legacy";
  /**
   * Progress fill mode. `cover` = P1 soft wash from poster dominant color.
   * `original` = fixed sky/emerald fills — only via Library Debug flag.
   */
  progressColorMode?: "cover" | "original";
  /**
   * Action-row chrome (progress capsule + ⋯ button + menu).
   * `frosted` = G1 glass (default). `flat` = previous style — Library Debug only.
   */
  progressChrome?: "frosted" | "flat";
  /**
   * Completed-torrent primary control.
   * `logo` = L1 frosted Seed circle (default).
   * `capsule` = previous full-width Seed/Pause capsule — Library Debug only.
   */
  completeAction?: "logo" | "capsule";
  /**
   * Seed-off logo treatment when completeAction is `logo`.
   * `red` = R3 red icon + soft tint (default).
   * `muted` = previous muted off state — Library Debug only.
   */
  seedOffStyle?: "red" | "muted";
  /**
   * File hover viewer. `dense-glass` = A2 (default).
   * `legacy` = previous flat list — Library Debug only.
   */
  filesViewerStyle?: TorrentFilesViewerStyle;
  /**
   * Piece status presentation. `field` = stats cell under Files (default).
   * `bookmark` = previous ribbon — Library Debug only.
   */
  piecesVariant?: PieceStatusVariant;
  /**
   * Pieces hover popup. `float` = Ring·Line glass (default).
   * `legacy` = previous framed popover — Library Debug only.
   */
  piecesPopupStyle?: PiecePopupStyle;
}

export const glassShell = cn(
  "border border-white/20",
  "bg-linear-to-b from-white/14 to-white/6",
  "shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);