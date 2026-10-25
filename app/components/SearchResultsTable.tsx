import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  DownloadIcon,
  ClockIcon,
  ArrowUpRightIcon,
  UsersIcon,
  FingerprintIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  SproutIcon,
  UserMinusIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  normalizeTorrentFiles,
  TorrentFilesHoverCard,
  type TorrentFilesViewerStyle,
} from "@/components/TorrentFilesHoverCard";
import { formatBytes, cn } from "@/lib/utils";
import type { ApiItem } from "../lib/types";

/** Dense (A2) is production default; legacy only via DEV debug flag. */
export type SearchResultsView = "dense" | "legacy";
/** Separated rows + container is production default; flush is prior dense stack. */
export type SearchResultsRows = "separated" | "flush";

interface Props {
  items: ApiItem[];
  onDownload: (hash: string, name: string, imdb?: string) => void;
  isLoading?: boolean;
  libraryHashes?: Set<string>;
  qbOnline?: boolean;
  /** DEV-only comparison; production always uses dense. */
  view?: SearchResultsView;
  /** DEV-only; production always uses separated. */
  rows?: SearchResultsRows;
  /** DEV-only; production always uses dense-glass. */
  filesViewerStyle?: TorrentFilesViewerStyle;
}

const fileCache: Record<string, { files: any[]; loading: boolean }> = {};

interface Label {
  text: string;
  color: string;
}

function detectLabels(name: string): Label[] {
  const labels: Label[] = [];
  const lower = name.toLowerCase();

  const checks: [string[], string, string][] = [
    [["2160p", "4k", "uhd"], "2160p", "bg-blue-500/15 text-blue-600"],
    [["1080p", "fhd", "full hd"], "1080p", "bg-sky-500/15 text-sky-600"],
    [["720p"], "720p", "bg-cyan-500/15 text-cyan-600"],
    [
      ["bluray", "blu-ray", "bdrip"],
      "BluRay",
      "bg-violet-500/15 text-violet-600",
    ],
    [["webrip", "web-rip"], "WEBRip", "bg-purple-500/15 text-purple-600"],
    [["web-dl", "webdl"], "WEB-DL", "bg-fuchsia-500/15 text-fuchsia-600"],
    [["brrip", "br-rip"], "BRRip", "bg-pink-500/15 text-pink-600"],
    [["x265", "hevc", "h265"], "x265", "bg-slate-500/15 text-slate-600"],
    [["x264", "h264", "avc"], "x264", "bg-stone-500/15 text-stone-600"],
    [["hdr10+", "hdr10+"], "HDR10+", "bg-amber-500/15 text-amber-600"],
    [["hdr10"], "HDR10", "bg-amber-500/15 text-amber-600"],
    [
      ["dolby vision", "dolbyvision"],
      "DV",
      "bg-yellow-500/15 text-yellow-600",
    ],
    [["hdr"], "HDR", "bg-amber-500/15 text-amber-600"],
  ];

  const seen = new Set<string>();
  for (const [patterns, text, color] of checks) {
    if (seen.has(text)) continue;
    if (patterns.some((p) => lower.includes(p))) {
      labels.push({ text, color });
      seen.add(text);
      for (const p of patterns) seen.add(p);
    }
  }

  return labels.slice(0, 4);
}

function getHealthLabel(seeders: number): Label {
  if (seeders >= 50)
    return { text: "Healthy", color: "bg-emerald-500/15 text-emerald-600" };
  if (seeders >= 10)
    return { text: "Good", color: "bg-amber-500/15 text-amber-600" };
  if (seeders >= 1)
    return { text: "Low", color: "bg-red-500/15 text-red-600" };
  return { text: "Dead", color: "bg-muted text-muted-foreground" };
}

function healthBorder(seeders: number): string {
  if (seeders >= 50) return "border-l-emerald-500";
  if (seeders >= 10) return "border-l-amber-500";
  if (seeders >= 1) return "border-l-red-500";
  return "border-l-muted-foreground/40";
}

function HashMeta({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  const copyHash = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={80}
        className="inline-flex cursor-default items-center gap-1 text-xs transition-colors hover:text-foreground"
      >
        <FingerprintIcon className="size-3 shrink-0" />
        <span>Hash</span>
        <ChevronDownIcon className="size-2.5 shrink-0 opacity-60" />
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-72 p-2">
        <div className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
          Torrent hash
        </div>
        <p className="mb-2 break-all font-mono text-[0.6875rem] leading-relaxed text-foreground/80">
          {hash}
        </p>
        <button
          type="button"
          onClick={copyHash}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          {copied ? (
            <CheckIcon className="size-3 text-emerald-600" />
          ) : (
            <CopyIcon className="size-3" />
          )}
          {copied ? "Copied" : "Copy hash"}
        </button>
      </HoverCardContent>
    </HoverCard>
  );
}

function FilesMeta({
  itemId,
  numFiles,
  filesViewerStyle,
}: {
  itemId: string;
  numFiles: number;
  filesViewerStyle: TorrentFilesViewerStyle;
}) {
  const cached = fileCache[itemId];

  return (
    <TorrentFilesHoverCard
      fileCount={numFiles}
      loading={cached?.loading ?? false}
      files={normalizeTorrentFiles(cached?.files ?? [])}
      emptyLabel="0 files"
      triggerClassName="gap-1 text-[0.6875rem] text-muted-foreground hover:text-foreground"
      viewerStyle={filesViewerStyle}
    />
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof HardDriveIcon;
  value: string | number;
  label: string;
  tone?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums text-muted-foreground",
        tone,
      )}
      title={label}
    >
      <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
      <span className="text-[0.6875rem] font-medium text-foreground/90">
        {value}
      </span>
    </span>
  );
}

function DenseRow({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
  separated,
  filesViewerStyle,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
  separated: boolean;
  filesViewerStyle: TorrentFilesViewerStyle;
}) {
  const seeders = +item.seeders;
  const leechers = +item.leechers;
  const numFiles = +item.num_files;
  const size = formatBytes(+item.size);
  const added = formatDistanceToNow(new Date(+item.added * 1000), {
    addSuffix: true,
  });

  const addLabel = !qbOnline
    ? "qBittorrent is offline"
    : inLibrary
      ? "In library"
      : "Add to library";

  return (
    <div
      className={cn(
        separated
          ? "rounded-lg border border-border/60 bg-card px-2.5 py-2.5 transition-colors hover:border-border hover:bg-muted/20"
          : "border-b border-border/50 py-2 last:border-b-0",
      )}
      onMouseEnter={onHover}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-snug"
          title={item.name}
        >
          {item.name}
        </p>
        <button
          type="button"
          title={addLabel}
          aria-label={addLabel}
          disabled={!inLibrary && !qbOnline}
          onClick={() => {
            if (inLibrary || !qbOnline) return;
            onDownload(item.info_hash, item.name, item.imdb || undefined);
          }}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
            inLibrary
              ? "bg-emerald-600 text-white"
              : "cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {inLibrary ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <DownloadIcon className="size-3.5" />
          )}
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Stat icon={HardDriveIcon} value={size} label="Size" />
        <Stat
          icon={SproutIcon}
          value={seeders}
          label="Seeders"
          tone="text-emerald-600"
        />
        <Stat
          icon={UserMinusIcon}
          value={leechers}
          label="Leechers"
          tone="text-red-500"
        />
        <FilesMeta
          itemId={item.id}
          numFiles={numFiles}
          filesViewerStyle={filesViewerStyle}
        />
        <Stat icon={ClockIcon} value={added} label="Added" />
        {item.imdb ? (
          <a
            href={`https://www.imdb.com/title/${item.imdb}`}
            target="_blank"
            rel="noreferrer"
            title="IMDb"
            aria-label="IMDb"
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function LegacyCard({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
  filesViewerStyle,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
  filesViewerStyle: TorrentFilesViewerStyle;
}) {
  const seeders = +item.seeders;
  const leechers = +item.leechers;
  const numFiles = +item.num_files;
  const added = formatDistanceToNow(new Date(+item.added * 1000), {
    addSuffix: true,
  });
  const size = formatBytes(+item.size);
  const labels = detectLabels(item.name);
  const health = getHealthLabel(seeders);

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border border-l-[0.1875rem] bg-card p-3 transition-shadow hover:shadow-sm sm:p-3.5",
        healthBorder(seeders),
      )}
      onMouseEnter={onHover}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="min-w-0 flex-1 text-[0.9375rem] font-semibold leading-relaxed tracking-tight sm:text-base"
          title={item.name}
        >
          {item.name}
        </div>
        <div className="shrink-0 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          <HashMeta hash={item.info_hash} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {labels.map((l) => (
          <span
            key={l.text}
            className={cn(
              "inline-flex h-5 items-center rounded-sm px-2 text-[0.6875rem] font-medium",
              l.color,
            )}
          >
            {l.text}
          </span>
        ))}
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-sm px-2 text-[0.6875rem] font-medium",
            health.color,
          )}
        >
          {health.text}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-muted/60 px-2.5 py-1 text-sm font-semibold tabular-nums">
          {size}
        </span>

        <div
          className="inline-flex items-stretch overflow-hidden rounded-md tabular-nums"
          title={`${seeders} seeders · ${leechers} leechers`}
        >
          <span className="inline-flex items-center gap-1.5 bg-emerald-600 px-2.5 py-1 text-white">
            <UsersIcon className="size-4 shrink-0" />
            <span className="text-sm font-semibold">{seeders}</span>
          </span>

          <span className="inline-flex items-center gap-1 bg-red-600 px-2 py-1 text-white">
            <UsersIcon className="size-3 shrink-0" />
            <span className="text-xs font-semibold">{leechers}</span>
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <FilesMeta
          itemId={item.id}
          numFiles={numFiles}
          filesViewerStyle={filesViewerStyle}
        />

        <span className="inline-flex items-center gap-1" title={added}>
          <ClockIcon className="size-3.5 shrink-0" />
          <span>{added}</span>
        </span>

        {item.imdb ? (
          <a
            href={`https://www.imdb.com/title/${item.imdb}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 rounded-sm bg-imdb-soft px-1.5 py-0.5 text-[0.6875rem] font-medium text-imdb-foreground transition-colors hover:bg-imdb-soft-hover"
            onClick={(e) => e.stopPropagation()}
          >
            IMDb
            <ArrowUpRightIcon className="size-2.5" />
          </a>
        ) : null}
      </div>

      {inLibrary ? (
        <div
          className="-mx-3 -mb-3 mt-3 flex items-center justify-center gap-2 bg-emerald-600 py-2.5 text-white sm:-mx-3.5 sm:-mb-3.5"
          title="This torrent is already in your library"
        >
          <CheckIcon className="size-4 shrink-0 stroke-[2.5]" />
          <span className="text-sm font-semibold">In Library</span>
        </div>
      ) : (
        <div className="mt-3 flex justify-end border-t border-border/60 pt-2.5">
          <Button
            size="sm"
            disabled={!qbOnline}
            title={qbOnline ? undefined : "qBittorrent is offline"}
            onClick={() =>
              onDownload(item.info_hash, item.name, item.imdb || undefined)
            }
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <DownloadIcon />
            Add to library
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function SearchResults({
  items,
  onDownload,
  isLoading = false,
  libraryHashes = new Set(),
  qbOnline = true,
  view = "dense",
  rows = "separated",
  filesViewerStyle = "dense-glass",
}: Props) {
  const [, rerender] = useState(0);
  const effectiveView: SearchResultsView = import.meta.env.DEV
    ? view
    : "dense";
  const effectiveRows: SearchResultsRows = import.meta.env.DEV
    ? rows
    : "separated";
  const effectiveFilesStyle: TorrentFilesViewerStyle = import.meta.env.DEV
    ? filesViewerStyle
    : "dense-glass";
  const separated = effectiveRows === "separated";

  const prevItems = useRef(items);
  useEffect(() => {
    if (prevItems.current !== items) {
      Object.keys(fileCache).forEach((k) => delete fileCache[k]);
      prevItems.current = items;
    }
  }, [items]);

  const loadFiles = useCallback((id: string) => {
    if (fileCache[id]) return;
    fileCache[id] = { files: [], loading: true };
    rerender((n) => n + 1);
    fetch(`/api/search_files?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        fileCache[id] = {
          files: data.files || [],
          loading: false,
        };
        rerender((n) => n + 1);
      })
      .catch(() => {
        fileCache[id] = { files: [], loading: false };
        rerender((n) => n + 1);
      });
  }, []);

  if (isLoading && items.length === 0) {
    return <EmptyState>Searching…</EmptyState>;
  }

  if (items.length === 0) {
    return <EmptyState>No torrents found</EmptyState>;
  }

  if (effectiveView === "legacy") {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <LegacyCard
            key={item.id}
            item={item}
            inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
            qbOnline={qbOnline}
            onDownload={onDownload}
            onHover={() => loadFiles(item.id)}
            filesViewerStyle={effectiveFilesStyle}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/20",
        separated ? "space-y-2 p-2 sm:p-2.5" : "px-2.5 sm:px-3",
      )}
    >
      {items.map((item) => (
        <DenseRow
          key={item.id}
          item={item}
          inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
          qbOnline={qbOnline}
          onDownload={onDownload}
          onHover={() => loadFiles(item.id)}
          separated={separated}
          filesViewerStyle={effectiveFilesStyle}
        />
      ))}
    </div>
  );
}
