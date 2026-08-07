import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DownloadIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilesIcon,
  HardDriveIcon,
  SproutIcon,
  UserMinusIcon,
  CheckIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  normalizeTorrentFiles,
  TorrentFilesHoverCard,
} from "@/components/TorrentFilesHoverCard";
import { formatBytes, cn } from "@/lib/utils";
import type { ApiItem } from "@/lib/types";

/** Soft well (title trail) is production default; older layouts only via DEV debug flag. */
export type SearchResultsView = "well" | "meta" | "chips" | "clean";

interface Props {
  items: ApiItem[];
  onDownload: (hash: string, name: string, imdb?: string) => void;
  isLoading?: boolean;
  libraryHashes?: Set<string>;
  qbOnline?: boolean;
  /** DEV-only comparison; production always uses well (title trail). */
  resultsView?: SearchResultsView;
}

const fileCache: Record<string, { files: any[]; loading: boolean }> = {};

function FilesMeta({
  itemId,
  numFiles,
  variant,
}: {
  itemId: string;
  numFiles: number;
  variant: "well" | "chips" | "clean";
}) {
  const cached = fileCache[itemId];

  const triggerClassName =
    variant === "chips"
      ? "gap-1 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[0.625rem] font-medium text-white/80 hover:bg-white/10 hover:text-white"
      : variant === "well"
        ? "gap-1 text-[0.625rem] font-medium text-white/55 hover:text-white/90"
        : "gap-1 text-[0.6875rem] text-muted-foreground hover:text-foreground";

  return (
    <TorrentFilesHoverCard
      fileCount={numFiles}
      loading={cached?.loading ?? false}
      files={normalizeTorrentFiles(cached?.files ?? [])}
      emptyLabel="0 files"
      triggerClassName={triggerClassName}
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

function DotSep() {
  return (
    <span
      className="select-none text-[0.625rem] text-muted-foreground/45"
      aria-hidden
    >
      ·
    </span>
  );
}

function AddButton({
  inLibrary,
  qbOnline,
  onDownload,
  chips,
}: {
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: () => void;
  chips?: boolean;
}) {
  const addLabel = !qbOnline
    ? "qBittorrent is offline"
    : inLibrary
      ? "In library"
      : "Add to library";

  return (
    <button
      type="button"
      title={addLabel}
      aria-label={addLabel}
      disabled={!inLibrary && !qbOnline}
      onClick={() => {
        if (inLibrary || !qbOnline) return;
        onDownload();
      }}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
        inLibrary
          ? "bg-emerald-600 text-white"
          : chips
            ? "cursor-pointer text-white/45 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            : "cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {inLibrary ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <DownloadIcon className="size-3.5" />
      )}
    </button>
  );
}

function MetaChip({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5",
        "text-[0.625rem] font-medium tabular-nums text-white/80",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SoftWell({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-0 bg-black/35 px-2 py-0.5",
        "text-[0.625rem] font-medium tabular-nums text-white/80",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.65),inset_0_-1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NakedMeta({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 text-[0.625rem] font-medium tabular-nums text-white/55",
        className,
      )}
    >
      {children}
    </span>
  );
}

function rowMeta(item: ApiItem) {
  return {
    seeders: +item.seeders,
    leechers: +item.leechers,
    numFiles: +item.num_files,
    size: formatBytes(+item.size),
    added: formatDistanceToNow(new Date(+item.added * 1000), {
      addSuffix: true,
    }),
  };
}

/* ─── Clean (legacy) ──────────────────────────────────────── */

function CleanRow({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
}) {
  const { seeders, leechers, numFiles, size, added } = rowMeta(item);

  return (
    <div
      className="border-b border-border/50 py-2 last:border-b-0"
      onMouseEnter={onHover}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-snug"
          title={item.name}
        >
          {item.name}
        </p>
        <AddButton
          inLibrary={inLibrary}
          qbOnline={qbOnline}
          onDownload={() =>
            onDownload(item.info_hash, item.name, item.imdb || undefined)
          }
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Stat icon={HardDriveIcon} value={size} label="Size" />
        <DotSep />
        <span
          className="inline-flex items-center gap-1.5 tabular-nums"
          title={`${seeders} seeders · ${leechers} leechers`}
        >
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <SproutIcon className="size-3 shrink-0 opacity-70" aria-hidden />
            <span className="text-[0.6875rem] font-medium text-foreground/90">
              {seeders}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <UserMinusIcon
              className="size-3 shrink-0 opacity-70"
              aria-hidden
            />
            <span className="text-[0.6875rem] font-medium text-foreground/90">
              {leechers}
            </span>
          </span>
        </span>
        <DotSep />
        <FilesMeta itemId={item.id} numFiles={numFiles} variant="clean" />
        <DotSep />
        <Stat icon={ClockIcon} value={added} label="Added" />
        {item.imdb ? (
          <>
            <DotSep />
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
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Soft well · title trail (default) ───────────────────── */

function WellRow({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
}) {
  const { seeders, leechers, numFiles, size, added } = rowMeta(item);

  return (
    <div
      className="border-b border-white/10 py-2.5 last:border-b-0"
      onMouseEnter={onHover}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="min-w-0 truncate text-[0.8125rem] font-medium leading-snug text-white/95"
              title={item.name}
            >
              {item.name}
            </p>
            {item.imdb ? (
              <a
                href={`https://www.imdb.com/title/${item.imdb}`}
                target="_blank"
                rel="noreferrer"
                title="IMDb"
                aria-label="IMDb"
                className="inline-flex shrink-0 items-center text-imdb hover:text-imdb-hover"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="size-3" />
              </a>
            ) : null}
          </div>
          <div
            className="mt-0.5 inline-flex items-center gap-1 text-[0.625rem] tabular-nums text-white/45"
            title="Added"
          >
            <ClockIcon className="size-2.5 shrink-0 opacity-70" aria-hidden />
            {added}
          </div>
        </div>
        <AddButton
          chips
          inLibrary={inLibrary}
          qbOnline={qbOnline}
          onDownload={() =>
            onDownload(item.info_hash, item.name, item.imdb || undefined)
          }
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <SoftWell title="Size">
          <HardDriveIcon className="size-2.5 opacity-60" aria-hidden />
          {size}
        </SoftWell>
        <SoftWell
          title={`${seeders} seeders · ${leechers} leechers`}
          className="gap-1.5"
        >
          <span className="inline-flex items-center gap-0.5 text-emerald-400">
            <SproutIcon className="size-2.5 opacity-70" aria-hidden />
            {seeders}
          </span>
          <span className="text-white/30">/</span>
          <span className="inline-flex items-center gap-0.5 text-white/55">
            <UserMinusIcon className="size-2.5 opacity-70" aria-hidden />
            {leechers}
          </span>
        </SoftWell>
        {numFiles === 0 ? (
          <NakedMeta title="Files">
            <FilesIcon className="size-2.5 opacity-60" aria-hidden />
            0 files
          </NakedMeta>
        ) : (
          <FilesMeta itemId={item.id} numFiles={numFiles} variant="well" />
        )}
      </div>
    </div>
  );
}

/* ─── Soft well · age in meta (legacy) ─────────────────────── */

function WellMetaRow({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
}) {
  const { seeders, leechers, numFiles, size, added } = rowMeta(item);

  return (
    <div
      className="border-b border-white/10 py-2.5 last:border-b-0"
      onMouseEnter={onHover}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-snug text-white/95"
          title={item.name}
        >
          {item.name}
        </p>
        <AddButton
          chips
          inLibrary={inLibrary}
          qbOnline={qbOnline}
          onDownload={() =>
            onDownload(item.info_hash, item.name, item.imdb || undefined)
          }
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <SoftWell title="Size">
          <HardDriveIcon className="size-2.5 opacity-60" aria-hidden />
          {size}
        </SoftWell>
        <SoftWell
          title={`${seeders} seeders · ${leechers} leechers`}
          className="gap-1.5"
        >
          <span className="inline-flex items-center gap-0.5 text-emerald-400">
            <SproutIcon className="size-2.5 opacity-70" aria-hidden />
            {seeders}
          </span>
          <span className="text-white/30">/</span>
          <span className="inline-flex items-center gap-0.5 text-white/55">
            <UserMinusIcon className="size-2.5 opacity-70" aria-hidden />
            {leechers}
          </span>
        </SoftWell>
        {numFiles === 0 ? (
          <NakedMeta title="Files">
            <FilesIcon className="size-2.5 opacity-60" aria-hidden />
            0 files
          </NakedMeta>
        ) : (
          <FilesMeta itemId={item.id} numFiles={numFiles} variant="well" />
        )}
        <NakedMeta title="Added">
          <ClockIcon className="size-2.5 opacity-60" aria-hidden />
          {added}
        </NakedMeta>
        {item.imdb ? (
          <a
            href={`https://www.imdb.com/title/${item.imdb}`}
            target="_blank"
            rel="noreferrer"
            title="IMDb"
            aria-label="IMDb"
            className="inline-flex items-center text-imdb hover:text-imdb-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Raised chips (legacy) ───────────────────────────────── */

function ChipsRow({
  item,
  inLibrary,
  qbOnline,
  onDownload,
  onHover,
}: {
  item: ApiItem;
  inLibrary: boolean;
  qbOnline: boolean;
  onDownload: Props["onDownload"];
  onHover: () => void;
}) {
  const { seeders, leechers, numFiles, size, added } = rowMeta(item);

  return (
    <div
      className="border-b border-white/10 py-2.5 last:border-b-0"
      onMouseEnter={onHover}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-snug text-white/95"
          title={item.name}
        >
          {item.name}
        </p>
        <AddButton
          chips
          inLibrary={inLibrary}
          qbOnline={qbOnline}
          onDownload={() =>
            onDownload(item.info_hash, item.name, item.imdb || undefined)
          }
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <MetaChip title="Size">
          <HardDriveIcon className="size-2.5 opacity-60" aria-hidden />
          {size}
        </MetaChip>
        <MetaChip
          title={`${seeders} seeders · ${leechers} leechers`}
          className="gap-1.5"
        >
          <span className="inline-flex items-center gap-0.5 text-emerald-400">
            <SproutIcon className="size-2.5 opacity-70" aria-hidden />
            {seeders}
          </span>
          <span className="text-white/30">/</span>
          <span className="inline-flex items-center gap-0.5 text-white/55">
            <UserMinusIcon className="size-2.5 opacity-70" aria-hidden />
            {leechers}
          </span>
        </MetaChip>
        {numFiles === 0 ? (
          <MetaChip title="Files">
            <FilesIcon className="size-2.5 opacity-60" aria-hidden />
            0
          </MetaChip>
        ) : (
          <FilesMeta itemId={item.id} numFiles={numFiles} variant="chips" />
        )}
        <MetaChip title="Added">
          <ClockIcon className="size-2.5 opacity-60" aria-hidden />
          {added}
        </MetaChip>
        {item.imdb ? (
          <a
            href={`https://www.imdb.com/title/${item.imdb}`}
            target="_blank"
            rel="noreferrer"
            title="IMDb"
            aria-label="IMDb"
            className="inline-flex items-center text-white/45 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  children,
  darkShell,
}: {
  children: ReactNode;
  darkShell: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-40 items-center justify-center rounded-lg border border-dashed text-sm",
        darkShell
          ? "border-black/40 bg-black/14 text-muted-foreground dark:bg-black/25"
          : "text-muted-foreground",
      )}
    >
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
  resultsView = "well",
}: Props) {
  const [, rerender] = useState(0);

  const view: SearchResultsView = import.meta.env.DEV ? resultsView : "well";
  const darkShell = view === "well" || view === "meta" || view === "chips";

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
    return <EmptyState darkShell={darkShell}>Searching…</EmptyState>;
  }

  if (items.length === 0) {
    return <EmptyState darkShell={darkShell}>No torrents found</EmptyState>;
  }

  if (view === "well") {
    return (
      <div className="rounded-xl border border-black/40 bg-black/14 px-2.5 dark:bg-black/25 sm:px-3">
        {items.map((item) => (
          <WellRow
            key={item.id}
            item={item}
            inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
            qbOnline={qbOnline}
            onDownload={onDownload}
            onHover={() => loadFiles(item.id)}
          />
        ))}
      </div>
    );
  }

  if (view === "meta") {
    return (
      <div className="rounded-xl border border-black/40 bg-black/14 px-2.5 dark:bg-black/25 sm:px-3">
        {items.map((item) => (
          <WellMetaRow
            key={item.id}
            item={item}
            inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
            qbOnline={qbOnline}
            onDownload={onDownload}
            onHover={() => loadFiles(item.id)}
          />
        ))}
      </div>
    );
  }

  if (view === "chips") {
    return (
      <div className="rounded-xl border border-black/40 bg-black/14 px-2.5 dark:bg-black/25 sm:px-3">
        {items.map((item) => (
          <ChipsRow
            key={item.id}
            item={item}
            inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
            qbOnline={qbOnline}
            onDownload={onDownload}
            onHover={() => loadFiles(item.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-2.5 sm:px-3">
      {items.map((item) => (
        <CleanRow
          key={item.id}
          item={item}
          inLibrary={libraryHashes.has(item.info_hash.toLowerCase())}
          qbOnline={qbOnline}
          onDownload={onDownload}
          onHover={() => loadFiles(item.id)}
        />
      ))}
    </div>
  );
}
