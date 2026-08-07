import {
  ArrowDownIcon,
  FilmIcon,
  HardDriveIcon,
  UsersIcon,
} from "lucide-react";

import {
  ActionRow,
  buildModel,
  type LibraryTorrentCardProps,
} from "@/components/shared/library/torrentCardParts";
import { useDominantColor } from "@/lib/dominant-color";
import { parseTorrentProps } from "@/lib/torrent-props";
import { cn, formatBytes } from "@/lib/utils";

function isPausedState(state: string) {
  const s = String(state).toLowerCase();
  return s.includes("paused") || s.includes("stopped");
}

function isCompleted(t: { progress: number; state: string }) {
  return (t.progress || 0) >= 1 || String(t.state).toLowerCase().includes("up");
}

function isDownloading(t: { progress: number; state: string }) {
  if (isCompleted(t) || isPausedState(t.state)) return false;
  const s = String(t.state).toLowerCase();
  return (
    s.includes("downloading") ||
    s.includes("forceddl") ||
    s.includes("stalleddl") ||
    s.includes("stalled") ||
    s.includes("queued") ||
    s.includes("meta") ||
    s.includes("allocat") ||
    s.includes("check")
  );
}

function formatRate(n: number) {
  if (!n || n < 1) return "0 B/s";
  return `${formatBytes(n, 1).replace(" ", "\u00A0")}/s`;
}

function formatSize(n: number) {
  return formatBytes(n, 1).replace(" ", "\u00A0");
}

const inkDrawer = cn(
  "border border-white/10 bg-black/75",
  "shadow-[0_12px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)]",
  "backdrop-blur-xl",
);

function FusedPropsPill({ name }: { name: string }) {
  const props = parseTorrentProps(name);
  if (!props.resolution && !props.source && !props.codec) return null;
  return (
    <div className="absolute left-1.5 top-1.5 z-10">
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-1",
          "border border-white/15 bg-black/60 text-[0.5625rem] font-semibold",
          "shadow-[0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-md",
        )}
      >
        {props.resolution ? (
          <span className="uppercase tracking-wide text-white">
            {props.resolution}
          </span>
        ) : null}
        {props.source ? (
          <span className="font-medium text-white/50">{props.source}</span>
        ) : null}
        {props.codec ? (
          <span className="font-medium uppercase text-white/40">{props.codec}</span>
        ) : null}
      </span>
    </div>
  );
}

function StatsMeta({
  seeds,
  dlspeed,
  size,
}: {
  seeds: number;
  dlspeed: number;
  size: number;
}) {
  return (
    <p className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden px-0.5 text-[0.5625rem] tabular-nums text-white/50">
      <span
        className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap"
        title="Seeders"
      >
        <UsersIcon className="size-2.5 text-sky-400" strokeWidth={2.5} />
        {seeds}
      </span>
      <span className="shrink-0 opacity-40">·</span>
      <span
        className="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden whitespace-nowrap text-emerald-300"
        title="Download speed"
      >
        <ArrowDownIcon className="size-2.5 shrink-0" />
        <span className="truncate">{formatRate(dlspeed)}</span>
      </span>
      <span className="shrink-0 opacity-40">·</span>
      <span
        className="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden whitespace-nowrap"
        title="Size"
      >
        <HardDriveIcon className="size-2.5 shrink-0 opacity-70" />
        <span className="truncate">{formatSize(size)}</span>
      </span>
    </p>
  );
}

/**
 * Cover-first library card: poster + Ink underlip drawer, fused quality pill,
 * Capsule Lip stats/actions. Desktop shelf layout.
 */
export function LibraryShelfCard(props: LibraryTorrentCardProps) {
  const model = buildModel(props);
  const { torrent: t, meta, displayTitle } = model;
  const dominantColor = useDominantColor(meta?.image);
  const progressColorOverride = import.meta.env.DEV
    ? (props.progressColorOverride ?? null)
    : null;

  const active = isDownloading(t);
  const complete = isCompleted(t);
  const seeds = t.num_seeds ?? 0;

  const completeLeading = complete ? (
    <span
      className="inline-flex min-w-0 flex-1 items-center gap-1 overflow-hidden whitespace-nowrap pl-1 text-[0.6875rem] font-medium tabular-nums text-white/50"
      title="Size"
    >
      <HardDriveIcon className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{formatSize(t.size)}</span>
    </span>
  ) : undefined;

  return (
    <article
      className="w-full max-w-[13rem] justify-self-center"
      title={displayTitle}
      onMouseEnter={props.onMouseEnter}
    >
      <div className="relative isolate">
        <div
          className={cn(
            "relative z-10 aspect-2/3 w-full overflow-hidden rounded-xl bg-muted",
            "shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/12",
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
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white/25">
              <FilmIcon className="size-10" />
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-2/3 w-full">
          <FusedPropsPill name={t.name} />
        </div>
        <div
          className={cn(
            "relative z-0 -mt-3 h-max rounded-b-2xl rounded-t-none border-t-0 px-2 pb-2 pt-5 text-white",
            inkDrawer,
          )}
        >
          <div className="w-full space-y-1.5">
            {active ? (
              <StatsMeta seeds={seeds} dlspeed={t.dlspeed || 0} size={t.size} />
            ) : null}
            <ActionRow
              model={model}
              dominantColor={dominantColor}
              progressColorOverride={progressColorOverride}
              completeLeading={completeLeading}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
