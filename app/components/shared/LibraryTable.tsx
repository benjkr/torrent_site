import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router";
import { imdbIdFromTags, normalizeImdbId } from "@/lib/imdb";
import { useImdbMetaMap } from "@/lib/imdb-meta";
import {
  isLibrarySimHash,
  makeLibrarySimFiles,
  makeLibrarySimTorrent,
  toggleLibrarySimPaused,
  type LibrarySimScenario,
} from "@/lib/library-sim-torrent";
import type { TorrentInfo, FileInfo } from "@/lib/types";
import { startViewTransition } from "@/lib/view-transition";
import {
  LibraryChrome,
  type LibraryFilterId,
} from "@/components/shared/LibraryChrome";
import {
  LibraryTorrentCard,
  type LibraryCardLayout,
} from "@/components/LibraryTorrentCard";
import { LibraryPosterDetail } from "@/components/desktop/library/LibraryPosterDetail";
import LibraryDebugPanel, {
  type LibraryCardGap,
  type PosterDetailMode,
} from "@/components/shared/LibraryDebugPanel";
import { useMdUp } from "@/components/shared/ViewportGate";
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
  const [cardLayout, setCardLayout] = useState<LibraryCardLayout>("shelf");
  const [cardGap, setCardGap] = useState<LibraryCardGap>("roomier");
  const [posterDetailMode, setPosterDetailMode] =
    useState<PosterDetailMode>("twin");
  const [posterWidthRem, setPosterWidthRem] = useState(11.5);
  const [simScenario, setSimScenario] = useState<LibrarySimScenario>("off");
  const [simPausedOverride, setSimPausedOverride] = useState<boolean | null>(
    null,
  );
  const [simProgress, setSimProgress] = useState(0.42);
  const [simProgressColor, setSimProgressColor] = useState("#6ee7b7");
  const [openHash, setOpenHash] = useState<string | null>(null);
  const [shelfVtHash, setShelfVtHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const isDev = import.meta.env.DEV;
  const mdUp = useMdUp();
  const vtUid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => setMounted(true), []);

  // Prefill / update from ?q= when navigating from toast ("View in Library").
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Reset local sim overrides when the scenario changes.
  useEffect(() => {
    setSimPausedOverride(null);
    if (simScenario === "off") return;
    const base = makeLibrarySimTorrent(simScenario);
    setSimProgress(base.progress);
  }, [simScenario]);

  // Animate download progress so sparkles / width transitions can be tested.
  useEffect(() => {
    if (!isDev || simScenario === "off") return;
    const paused =
      simPausedOverride ??
      (simScenario === "paused" || simScenario === "finished");
    const { state, dlspeed } = toggleLibrarySimPaused(simScenario, paused);
    const activeDl =
      state.toLowerCase().includes("downloading") && dlspeed > 0;
    if (!activeDl) return;
    const id = window.setInterval(() => {
      setSimProgress((p) => (p >= 0.96 ? 0.08 : Math.min(0.96, p + 0.012)));
    }, 280);
    return () => window.clearInterval(id);
  }, [isDev, simScenario, simPausedOverride]);

  const displayTorrents = useMemo(() => {
    if (!isDev || simScenario === "off") return torrents;
    const base = makeLibrarySimTorrent(simScenario);
    const paused =
      simPausedOverride ??
      (simScenario === "paused" || simScenario === "finished");
    const speeds = toggleLibrarySimPaused(simScenario, paused);
    const progress =
      simScenario === "downloading" || simScenario === "paused"
        ? simProgress
        : base.progress;
    const sim = makeLibrarySimTorrent(simScenario, {
      progress,
      ...speeds,
      eta:
        simScenario === "downloading" && !paused
          ? Math.max(
              60,
              Math.round(((1 - progress) * base.size) / Math.max(1, speeds.dlspeed)),
            )
          : base.eta,
    });
    return [sim, ...torrents.filter((t) => !isLibrarySimHash(t.hash))];
  }, [isDev, torrents, simScenario, simPausedOverride, simProgress]);

  const counts = useMemo(() => {
    return {
      all: displayTorrents.length,
      downloading: displayTorrents.filter(isDownloading).length,
      completed: displayTorrents.filter(isCompleted).length,
      active: displayTorrents.filter(isActive).length,
      paused: displayTorrents.filter((t) => isPausedState(t.state)).length,
    };
  }, [displayTorrents]);

  // Load meta for all tagged torrents so title search can match show names.
  const allImdbIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of displayTorrents) {
      const id = imdbIdFromTags(t.tags);
      if (id) ids.add(id);
    }
    return Array.from(ids);
  }, [displayTorrents]);

  const imdbMap = useImdbMetaMap(allImdbIds);

  const filtered = useMemo(() => {
    let list = displayTorrents;
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
  }, [displayTorrents, filter, query, urlQuery, urlImdb, imdbMap]);

  const ensureFiles = useCallback(
    (hash: string) => {
      if (isLibrarySimHash(hash)) return;
      if (hash in filesMap || requestedFiles.has(hash)) return;
      setRequestedFiles((prev) => new Set(prev).add(hash));
      onFetchFiles(hash);
    },
    [filesMap, requestedFiles, onFetchFiles],
  );

  const handlePause = useCallback(
    (hash: string) => {
      if (isLibrarySimHash(hash)) {
        setSimPausedOverride(true);
        return;
      }
      onPause(hash);
    },
    [onPause],
  );

  const handleResume = useCallback(
    (hash: string) => {
      if (isLibrarySimHash(hash)) {
        setSimPausedOverride(false);
        return;
      }
      onResume(hash);
    },
    [onResume],
  );

  const handleRecheck = useCallback(
    (hash: string) => {
      if (isLibrarySimHash(hash)) return;
      onRecheck(hash);
    },
    [onRecheck],
  );

  const handleReannounce = useCallback(
    (hash: string) => {
      if (isLibrarySimHash(hash)) return;
      onReannounce(hash);
    },
    [onReannounce],
  );

  const handleDelete = useCallback(
    (hash: string, withFiles: boolean) => {
      if (isLibrarySimHash(hash)) {
        setSimScenario("off");
        return;
      }
      onDelete(hash, withFiles);
    },
    [onDelete],
  );

  const shelfLayout = !isDev || cardLayout === "shelf";
  const shelfGapClass =
    !isDev || cardGap === "roomier"
      ? "gap-3"
      : cardGap === "cozy"
        ? "gap-5"
        : "gap-10";
  /** DEV poster size slider; production always 11.5rem. */
  const shelfPosterRem = isDev ? posterWidthRem : 11.5;
  /** Twin Pane poster detail — desktop default; DEV can turn Off. */
  const posterDetailEnabled =
    mdUp && shelfLayout && (!isDev || posterDetailMode === "twin");

  const vtToken = useCallback(
    (hash: string) => `lib-poster-${hash}-${vtUid}`,
    [vtUid],
  );

  const openDetail = useCallback(
    (hash: string) => {
      ensureFiles(hash);
      flushSync(() => setShelfVtHash(hash));
      startViewTransition(() => {
        setOpenHash(hash);
        setShelfVtHash(null);
      });
    },
    [ensureFiles],
  );

  const closeDetail = useCallback(() => {
    if (!openHash) return;
    const hash = openHash;
    const t = startViewTransition(() => {
      setOpenHash(null);
      setShelfVtHash(hash);
    });
    if (t?.finished) {
      void t.finished.finally(() => setShelfVtHash(null));
    } else {
      setShelfVtHash(null);
    }
  }, [openHash]);

  useEffect(() => {
    if (!openHash) return;
    const hash = openHash;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = startViewTransition(() => {
        setOpenHash(null);
        setShelfVtHash(hash);
      });
      if (t?.finished) {
        void t.finished.finally(() => setShelfVtHash(null));
      } else {
        setShelfVtHash(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openHash]);

  // Close detail if the torrent disappears from the filtered list / layout changes.
  useEffect(() => {
    if (!openHash) return;
    if (!posterDetailEnabled || !filtered.some((t) => t.hash === openHash)) {
      setOpenHash(null);
      setShelfVtHash(null);
    }
  }, [openHash, posterDetailEnabled, filtered]);

  const openTorrent = openHash
    ? (displayTorrents.find((t) => t.hash === openHash) ?? null)
    : null;

  return (
    <div className="mt-0 space-y-2">
      <style>{`
        ::view-transition-group(root) {
          animation-duration: 0.32s;
        }
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation-duration: 0.28s;
          mix-blend-mode: normal;
        }
      `}</style>

      <LibraryChrome
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          {displayTorrents.length === 0
            ? "No torrents in your library yet. Search and download something to get started."
            : "No torrents match this filter."}
        </div>
      ) : (
        <div
          className={cn(
            "grid pt-0",
            shelfGapClass,
            !shelfLayout && "grid-cols-1 @md:grid-cols-2",
          )}
          style={
            shelfLayout
              ? ({
                  gridTemplateColumns: `repeat(auto-fill, minmax(${shelfPosterRem}rem, 1fr))`,
                  ["--library-poster-w"]: `${shelfPosterRem}rem`,
                } as CSSProperties)
              : undefined
          }
        >
          {filtered.map((t) => {
            const imdbId = imdbIdFromTags(t.tags);
            const meta = imdbId ? imdbMap[imdbId] : undefined;
            const sim = isLibrarySimHash(t.hash);
            const files = sim
              ? makeLibrarySimFiles(t.progress)
              : filesMap[t.hash];
            const isLoadingFiles =
              !sim && requestedFiles.has(t.hash) && files === undefined;

            return (
              <LibraryTorrentCard
                key={t.hash}
                layout={isDev ? cardLayout : "shelf"}
                progressColorOverride={
                  isDev && sim ? simProgressColor : undefined
                }
                torrent={t}
                meta={meta}
                files={files}
                isLoadingFiles={isLoadingFiles}
                formatBytes={formatBytes}
                onFetchFiles={() => ensureFiles(t.hash)}
                onDownloadFile={(file) => {
                  if (sim) return;
                  onDownloadFile(t.hash, file);
                }}
                onPause={() => handlePause(t.hash)}
                onResume={() => handleResume(t.hash)}
                onRecheck={() => handleRecheck(t.hash)}
                onReannounce={() => handleReannounce(t.hash)}
                onDelete={(withFiles) => handleDelete(t.hash, withFiles)}
                onMouseEnter={() => ensureFiles(t.hash)}
                onPosterClick={
                  posterDetailEnabled
                    ? () => openDetail(t.hash)
                    : undefined
                }
                posterVtName={
                  posterDetailEnabled &&
                  shelfVtHash === t.hash &&
                  openHash !== t.hash
                    ? vtToken(t.hash)
                    : null
                }
              />
            );
          })}
        </div>
      )}

      {mounted && openTorrent && posterDetailEnabled ? (
        <LibraryPosterDetail
          vtName={vtToken(openTorrent.hash)}
          onClose={closeDetail}
          torrent={openTorrent}
          meta={
            (() => {
              const id = imdbIdFromTags(openTorrent.tags);
              return id ? imdbMap[id] : undefined;
            })()
          }
          files={
            isLibrarySimHash(openTorrent.hash)
              ? makeLibrarySimFiles(openTorrent.progress)
              : filesMap[openTorrent.hash]
          }
          isLoadingFiles={
            !isLibrarySimHash(openTorrent.hash) &&
            requestedFiles.has(openTorrent.hash) &&
            filesMap[openTorrent.hash] === undefined
          }
          formatBytes={formatBytes}
          onFetchFiles={() => ensureFiles(openTorrent.hash)}
          onDownloadFile={(file) => {
            if (isLibrarySimHash(openTorrent.hash)) return;
            onDownloadFile(openTorrent.hash, file);
          }}
          onPause={() => handlePause(openTorrent.hash)}
          onResume={() => handleResume(openTorrent.hash)}
          onRecheck={() => handleRecheck(openTorrent.hash)}
          onReannounce={() => handleReannounce(openTorrent.hash)}
          onDelete={(withFiles) => handleDelete(openTorrent.hash, withFiles)}
          onMouseEnter={() => ensureFiles(openTorrent.hash)}
          progressColorOverride={
            isDev && isLibrarySimHash(openTorrent.hash)
              ? simProgressColor
              : undefined
          }
        />
      ) : null}

      {isDev ? (
        <LibraryDebugPanel
          cardLayout={cardLayout}
          onCardLayoutChange={setCardLayout}
          cardGap={cardGap}
          onCardGapChange={setCardGap}
          posterDetailMode={posterDetailMode}
          onPosterDetailModeChange={setPosterDetailMode}
          posterWidthRem={posterWidthRem}
          onPosterWidthRemChange={setPosterWidthRem}
          simScenario={simScenario}
          onSimScenarioChange={setSimScenario}
          simProgressColor={simProgressColor}
          onSimProgressColorChange={setSimProgressColor}
        />
      ) : null}
    </div>
  );
}
