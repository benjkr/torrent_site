import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { imdbIdFromTags, normalizeImdbId } from "@/lib/imdb";
import { useImdbMetaMap } from "@/lib/imdb-meta";
import type { TorrentInfo, FileInfo } from "@/lib/types";
import {
  LibraryChrome,
  type LibraryChromeDensity,
  type LibraryChromeView,
  type LibraryFilterId,
} from "@/components/shared/LibraryChrome";
import { LibraryTorrentCard } from "@/components/LibraryTorrentCard";
import LibraryDebugPanel, {
  type LibraryCardView,
  type LibraryCompleteAction,
  type LibraryPiecesPopupStyle,
  type LibraryPiecesVariant,
  type LibraryProgressChrome,
  type LibraryProgressColorMode,
  type LibrarySeedOffStyle,
} from "@/components/shared/LibraryDebugPanel";
import type { TorrentFilesViewerStyle } from "@/components/shared/TorrentFilesHoverCard";
import { cn } from "@/lib/utils";

interface LibraryTableProps {
  torrents: TorrentInfo[];
  filesMap: Record<string, FileInfo[]>;
  onFetchFiles: (hash: string) => void;
  onDownloadFile: (hash: string, file: string) => void;
  formatBytes: (bytes: number) => string;
  onPause: (hash: string) => void;
  onResume: (hash: string) => void;
  onRecheck: (hash: string) => void;
  onReannounce: (hash: string) => void;
  onDelete: (hash: string, withFiles: boolean) => void;
}

function isPausedState(state: string) {
  const s = String(state).toLowerCase();
  return s.includes("paused") || s.includes("stopped");
}

function isCompleted(t: TorrentInfo) {
  return (t.progress || 0) >= 1 || String(t.state).toLowerCase().includes("up");
}

function isDownloading(t: TorrentInfo) {
  if (isCompleted(t) || isPausedState(t.state)) return false;
  const s = String(t.state).toLowerCase();
  return (
    s.includes("down") ||
    s.includes("meta") ||
    s.includes("allocat") ||
    s.includes("check") ||
    s.includes("stalled") ||
    s.includes("queued")
  );
}

function isActive(t: TorrentInfo) {
  return (t.dlspeed || 0) > 0 || (t.upspeed || 0) > 0;
}

/** Normalize for matching "The Matrix" against "The.Matrix.1999…". */
function normalizeSearchText(s: string) {
  return s
    .toLowerCase()
    .replace(/[._\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textMatches(haystack: string, needle: string) {
  if (!haystack || !needle) return false;
  return normalizeSearchText(haystack).includes(needle);
}

export default function LibraryTable({
  torrents,
  filesMap,
  onFetchFiles,
  onDownloadFile,
  formatBytes,
  onPause,
  onResume,
  onRecheck,
  onReannounce,
  onDelete,
}: LibraryTableProps) {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlImdb = normalizeImdbId(searchParams.get("imdb"));

  const [filter, setFilter] = useState<LibraryFilterId>("all");
  const [query, setQuery] = useState(urlQuery);
  const [requestedFiles, setRequestedFiles] = useState<Set<string>>(
    () => new Set(),
  );
  const [cardView, setCardView] = useState<LibraryCardView>("legacy");
  const [chromeView, setChromeView] = useState<LibraryChromeView>("compact");
  const [chromeDensity, setChromeDensity] =
    useState<LibraryChromeDensity>("tight");
  const [progressColorMode, setProgressColorMode] =
    useState<LibraryProgressColorMode>("cover");
  const [progressChrome, setProgressChrome] =
    useState<LibraryProgressChrome>("frosted");
  const [completeAction, setCompleteAction] =
    useState<LibraryCompleteAction>("logo");
  const [seedOffStyle, setSeedOffStyle] =
    useState<LibrarySeedOffStyle>("red");
  const [filesViewerStyle, setFilesViewerStyle] =
    useState<TorrentFilesViewerStyle>("dense-glass");
  const [piecesVariant, setPiecesVariant] =
    useState<LibraryPiecesVariant>("field");
  const [piecesPopupStyle, setPiecesPopupStyle] =
    useState<LibraryPiecesPopupStyle>("float");
  const isDev = import.meta.env.DEV;

  // Prefill / update from ?q= when navigating from toast ("View in Library").
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const counts = useMemo(() => {
    return {
      all: torrents.length,
      downloading: torrents.filter(isDownloading).length,
      completed: torrents.filter(isCompleted).length,
      active: torrents.filter(isActive).length,
      paused: torrents.filter((t) => isPausedState(t.state)).length,
    };
  }, [torrents]);

  // Load meta for all tagged torrents so title search can match show names.
  const allImdbIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of torrents) {
      const id = imdbIdFromTags(t.tags);
      if (id) ids.add(id);
    }
    return Array.from(ids);
  }, [torrents]);

  const imdbMap = useImdbMetaMap(allImdbIds);

  const filtered = useMemo(() => {
    let list = torrents;
    switch (filter) {
      case "downloading":
        list = list.filter(isDownloading);
        break;
      case "completed":
        list = list.filter(isCompleted);
        break;
      case "active":
        list = list.filter(isActive);
        break;
      case "paused":
        list = list.filter((t) => isPausedState(t.state));
        break;
      default:
        break;
    }
    const q = normalizeSearchText(query);
    const urlQ = normalizeSearchText(urlQuery);
    if (q) {
      list = list.filter((t) => {
        const id = imdbIdFromTags(t.tags);
        // Toast deep-link: keep the tagged torrent visible for the original ?q=.
        if (urlImdb && id === urlImdb && urlQ === q) return true;
        if (textMatches(t.name, q)) return true;
        if (textMatches(t.save_path || "", q)) return true;
        if (textMatches(t.category || "", q)) return true;
        if (textMatches(t.tags || "", q)) return true;
        const metaTitle = id ? imdbMap[id]?.title : undefined;
        if (metaTitle && textMatches(metaTitle, q)) return true;
        return false;
      });
    }
    return list;
  }, [torrents, filter, query, urlQuery, urlImdb, imdbMap]);

  const ensureFiles = useCallback(
    (hash: string) => {
      if (hash in filesMap || requestedFiles.has(hash)) return;
      setRequestedFiles((prev) => new Set(prev).add(hash));
      onFetchFiles(hash);
    },
    [filesMap, requestedFiles, onFetchFiles],
  );

  const density = isDev ? chromeDensity : "tight";
  const tight = density === "tight";

  return (
    <div className={tight ? "mt-0 space-y-2" : "mt-1 space-y-4"}>
      <LibraryChrome
        view={isDev ? chromeView : "compact"}
        density={density}
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          {torrents.length === 0
            ? "No torrents in your library yet. Search and download something to get started."
            : "No torrents match this filter."}
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 @md:grid-cols-2",
            tight ? "pt-0" : "pt-1",
          )}
        >
          {filtered.map((t) => {
            const imdbId = imdbIdFromTags(t.tags);
            const meta = imdbId ? imdbMap[imdbId] : undefined;
            const files = filesMap[t.hash];
            const isLoadingFiles =
              requestedFiles.has(t.hash) && files === undefined;

            return (
              <LibraryTorrentCard
                key={t.hash}
                variant={isDev ? cardView : "legacy"}
                progressColorMode={isDev ? progressColorMode : "cover"}
                progressChrome={isDev ? progressChrome : "frosted"}
                completeAction={isDev ? completeAction : "logo"}
                seedOffStyle={isDev ? seedOffStyle : "red"}
                filesViewerStyle={isDev ? filesViewerStyle : "dense-glass"}
                piecesVariant={isDev ? piecesVariant : "field"}
                piecesPopupStyle={isDev ? piecesPopupStyle : "float"}
                torrent={t}
                meta={meta}
                files={files}
                isLoadingFiles={isLoadingFiles}
                formatBytes={formatBytes}
                onFetchFiles={() => ensureFiles(t.hash)}
                onDownloadFile={(file) => onDownloadFile(t.hash, file)}
                onPause={() => onPause(t.hash)}
                onResume={() => onResume(t.hash)}
                onRecheck={() => onRecheck(t.hash)}
                onReannounce={() => onReannounce(t.hash)}
                onDelete={(withFiles) => onDelete(t.hash, withFiles)}
                onMouseEnter={() => ensureFiles(t.hash)}
              />
            );
          })}
        </div>
      )}

      {isDev ? (
        <LibraryDebugPanel
          chromeView={chromeView}
          onChromeViewChange={setChromeView}
          chromeDensity={chromeDensity}
          onChromeDensityChange={setChromeDensity}
          cardView={cardView}
          onCardViewChange={setCardView}
          progressColorMode={progressColorMode}
          onProgressColorModeChange={setProgressColorMode}
          progressChrome={progressChrome}
          onProgressChromeChange={setProgressChrome}
          completeAction={completeAction}
          onCompleteActionChange={setCompleteAction}
          seedOffStyle={seedOffStyle}
          onSeedOffStyleChange={setSeedOffStyle}
          filesViewerStyle={filesViewerStyle}
          onFilesViewerStyleChange={setFilesViewerStyle}
          piecesVariant={piecesVariant}
          onPiecesVariantChange={setPiecesVariant}
          piecesPopupStyle={piecesPopupStyle}
          onPiecesPopupStyleChange={setPiecesPopupStyle}
        />
      ) : null}
    </div>
  );
}
