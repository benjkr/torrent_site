import { createPortal } from "react-dom";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FilmIcon,
  PlayIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";

import { TorrentFileHierarchy } from "@/components/desktop/library/TorrentFileHierarchy";
import {
  ActionRow,
  buildModel,
  type LibraryTorrentCardProps,
} from "@/components/shared/library/torrentCardParts";
import { useDominantColor } from "@/lib/dominant-color";
import { cn, formatBytes as formatBytesUtil } from "@/lib/utils";

function glassShell(className?: string) {
  return cn(
    "rounded-2xl border border-white/20 bg-zinc-900/80 text-white",
    "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
    "backdrop-blur-2xl backdrop-saturate-150",
    className,
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/8 py-1.5 last:border-0">
      <span className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[0.6875rem] tabular-nums text-white/85">
        {children}
      </span>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Close"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/14 hover:text-white"
    >
      <XIcon className="size-4" />
    </button>
  );
}

export type LibraryPosterDetailProps = LibraryTorrentCardProps & {
  vtName: string;
  onClose: () => void;
};

/** Placeholder where in-browser watch will return later. */
function WatchComingSoon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative min-h-0 w-full overflow-hidden rounded-2xl bg-black",
        "ring-1 ring-white/20",
        "shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.18)]",
        className,
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[radial-gradient(ellipse_at_center,rgb(56,56,56,0.45),#050505_70%)] px-3 text-center">
        <PlayIcon className="size-6 text-white/25" />
        <p className="text-[0.6875rem] font-medium tracking-wide text-white/55">
          Coming soon
        </p>
        <p className="text-[0.5625rem] text-white/35">
          In-browser watch is not available yet
        </p>
      </div>
    </div>
  );
}

/**
 * Poster detail — stats | files. Completed torrents show a watch placeholder;
 * every file remains downloadable from the Files list.
 */
export function LibraryPosterDetail({
  vtName,
  onClose,
  ...cardProps
}: LibraryPosterDetailProps) {
  const model = buildModel(cardProps);
  const { torrent: t, meta, displayTitle, formatBytes, eta, status, complete } =
    model;
  const dominantColor = useDominantColor(meta?.image);
  const progressColorOverride = import.meta.env.DEV
    ? (cardProps.progressColorOverride ?? null)
    : null;

  const seeds = t.num_seeds ?? 0;
  const peers = t.num_leechs ?? t.num_leechers ?? 0;
  const files = cardProps.files ?? [];

  const fmtRate = (n: number) => {
    if (!n || n < 1) return "0 B/s";
    return `${formatBytesUtil(n, 1).replace(" ", "\u00A0")}/s`;
  };

  const posterStyle: CSSProperties = { viewTransitionName: vtName };

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 100 }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        <div
          role="dialog"
          aria-modal
          aria-label={displayTitle}
          className={cn(
            "pointer-events-auto",
            glassShell("bg-zinc-950/55 p-4"),
            "relative flex w-full max-w-6xl items-stretch gap-5 overflow-hidden",
            "h-[min(88vh,calc(16rem*3/2+2rem))] sm:h-[min(88vh,calc(18rem*3/2+2rem))]",
          )}
        >
          <div
            className={cn(
              "relative aspect-2/3 h-full w-64 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 sm:w-72",
              "ring-1 ring-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
            )}
            style={posterStyle}
          >
            {meta?.image ? (
              <img
                src={meta.image}
                alt=""
                className="absolute inset-0 size-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white/25">
                <FilmIcon className="size-12" />
              </div>
            )}
          </div>

          <div
            className={cn(
              "relative flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-white/12 bg-black/35 p-3.5",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                  {displayTitle}
                </h2>
                {meta?.year != null ? (
                  <p className="mt-1 text-[0.6875rem] text-white/50">
                    {meta.year}
                  </p>
                ) : null}
                <p
                  className="mt-1 truncate text-[0.625rem] text-white/40"
                  title={t.name}
                >
                  {t.name}
                </p>
              </div>
              <CloseBtn onClick={onClose} />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-1 gap-3">
              <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
                <div className="shrink-0 space-y-0.5">
                  {complete ? null : (
                    <MetaRow label="State">{status.text}</MetaRow>
                  )}
                  <MetaRow label="Size">{formatBytes(t.size)}</MetaRow>
                  {complete ? (
                    <MetaRow label="↑">
                      <span className="inline-flex items-center gap-0.5 text-sky-400">
                        <ArrowUpIcon className="size-3" />
                        {fmtRate(t.upspeed || 0)}
                      </span>
                    </MetaRow>
                  ) : (
                    <>
                      <MetaRow label="↓ / ↑">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5 text-emerald-400">
                            <ArrowDownIcon className="size-3" />
                            {fmtRate(t.dlspeed || 0)}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-sky-400">
                            <ArrowUpIcon className="size-3" />
                            {fmtRate(t.upspeed || 0)}
                          </span>
                        </span>
                      </MetaRow>
                      <MetaRow label="Peers">
                        <span className="inline-flex items-center gap-1">
                          <UsersIcon className="size-3 text-sky-400" />
                          {seeds}S · {peers}P
                        </span>
                      </MetaRow>
                    </>
                  )}
                </div>

                {complete ? (
                  <WatchComingSoon className="min-h-0 flex-1" />
                ) : (
                  <div className="mt-auto flex items-baseline justify-between gap-2 px-0.5">
                    <span className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
                      ETA
                    </span>
                    <span className="text-[0.6875rem] tabular-nums text-white/70">
                      {eta || "—"}
                    </span>
                  </div>
                )}

                <div className="shrink-0">
                  <ActionRow
                    model={model}
                    dominantColor={dominantColor}
                    progressColorOverride={progressColorOverride}
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/30 p-2.5">
                <TorrentFileHierarchy
                  className="min-h-0 flex-1"
                  files={files}
                  totalSize={t.size}
                  formatBytes={formatBytes}
                  loading={cardProps.isLoadingFiles}
                  onDownloadFile={cardProps.onDownloadFile}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
