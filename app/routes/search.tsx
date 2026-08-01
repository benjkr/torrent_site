import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import SearchBar from "../components/SearchBar";
import SearchResults, {
  type SearchResultsView,
} from "../components/SearchResultsTable";
import SearchSortStrip, {
  sortSearchItems,
  type SearchSortDir,
  type SearchSortKey,
} from "../components/SearchSortStrip";
import ImdbTitleCard, {
  type EpisodeSelection,
} from "../components/ImdbTitleCard";
import SearchDebugPanel from "../components/SearchDebugPanel";
import type {
  ApiItem,
  ImdbSuggestion,
  SearchDebugInfo,
  SearchResponse,
  TorrentInfo,
} from "../lib/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { notifyDownloadStarted } from "@/lib/download-notify";
import { episodeCode, seasonCode } from "@/lib/imdb";
import { useQbStatus } from "@/lib/qb-status";

const PPER = 12;

function isDebugResponse(
  data: SearchResponse,
): data is { items: ApiItem[]; debug: SearchDebugInfo } {
  return (
    data != null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "items" in data &&
    Array.isArray(data.items)
  );
}

function unwrapSearchResponse(data: SearchResponse | undefined): {
  items: ApiItem[];
  debug: SearchDebugInfo | null;
} {
  if (!data) return { items: [], debug: null };
  if (Array.isArray(data)) return { items: data, debug: null };
  if (isDebugResponse(data)) return { items: data.items, debug: data.debug };
  return { items: [], debug: null };
}

function parseEpisodeCode(raw: string | null): EpisodeSelection {
  if (!raw) return { mode: "none" };
  const m = raw.match(/^S(\d{2})(?:E(\d{2}))?$/i);
  if (!m) return { mode: "none" };
  const season = Number(m[1]);
  const epNum = m[2] ? Number(m[2]) : null;
  if (!Number.isFinite(season)) return { mode: "none" };
  if (epNum != null && Number.isFinite(epNum)) {
    return { mode: "episode", season, episode: epNum };
  }
  return { mode: "season", season };
}

function encodeEpisodeCode(ep: EpisodeSelection): string | null {
  if (ep.mode === "episode") return episodeCode(ep.season, ep.episode);
  if (ep.mode === "season") return seasonCode(ep.season);
  return null;
}

function buildQuery(
  selection: ImdbSuggestion | null,
  episode: EpisodeSelection,
): string | null {
  if (!selection) return null;
  if (episode.mode === "episode") {
    return `${selection.title} ${episodeCode(episode.season, episode.episode)}`;
  }
  if (episode.mode === "season") {
    return `${selection.title} ${seasonCode(episode.season)}`;
  }
  return selection.id;
}

function imdbFromParams(sp: URLSearchParams): ImdbSuggestion | null {
  const id = sp.get("imdb");
  const title = sp.get("title");
  if (!id || !title) return null;
  return { id, title, year: null, image: null, stars: "", type: "unknown" };
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** IMDb suggestions on unless `suggest=0`. */
function parseSuggest(raw: string | null): boolean {
  return raw !== "0";
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { online: qbOnline } = useQbStatus();

  const initQuery = searchParams.get("q") || "";
  const initFilters = searchParams.getAll("f");
  const initImdb = imdbFromParams(searchParams);
  const initEp = parseEpisodeCode(searchParams.get("ep"));
  const initPage = parsePage(searchParams.get("page"));
  const initSuggest = parseSuggest(searchParams.get("suggest"));

  const [query, setQuery] = useState(initQuery);
  const [filters, setFilters] = useState<string[]>(initFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [page, setPage] = useState(initPage);
  const [imdbMode, setImdbMode] = useState(initSuggest);
  const [imdbSelection, setImdbSelection] = useState<ImdbSuggestion | null>(
    initImdb,
  );
  const [episodeSelection, setEpisodeSelection] = useState<EpisodeSelection>(
    initEp,
  );
  const [clearSignal, setClearSignal] = useState(0);
  const [searchDebug, setSearchDebug] = useState<SearchDebugInfo | null>(null);
  const [lastSearchApiUrl, setLastSearchApiUrl] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SearchSortKey>("seeders");
  const [sortDir, setSortDir] = useState<SearchSortDir>("desc");
  const [resultsView, setResultsView] = useState<SearchResultsView>("well");

  const searchFetcher = useFetcher<SearchResponse>();
  const libraryFetcher = useFetcher<TorrentInfo[]>();
  const downloadFetcher = useFetcher<{ status?: string; error?: string }>();
  const pendingDownloadRef = useRef<string | null>(null);
  const downloadBusyRef = useRef(false);
  const filtersRef = useRef<string[]>(initFilters);
  const syncing = useRef(false);

  // URL ← state sync
  useEffect(() => {
    if (syncing.current) return;
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    filters.forEach((f) => next.append("f", f));
    if (imdbSelection) {
      next.set("imdb", imdbSelection.id);
      next.set("title", imdbSelection.title);
    }
    const epCode = encodeEpisodeCode(episodeSelection);
    if (epCode) next.set("ep", epCode);
    if (page > 1) next.set("page", String(page));
    if (!imdbMode) next.set("suggest", "0");

    const prev = searchParams.toString();
    const str = next.toString();
    if (str !== prev) {
      setSearchParams(next, { replace: true });
    }
  }, [query, filters, imdbSelection, episodeSelection, page, imdbMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL → state sync (browser back/forward)
  useEffect(() => {
    syncing.current = true;
    const urlQuery = searchParams.get("q") || "";
    const urlFilters = searchParams.getAll("f");
    const urlImdb = imdbFromParams(searchParams);
    const urlEp = parseEpisodeCode(searchParams.get("ep"));
    const urlPage = parsePage(searchParams.get("page"));
    const urlSuggest = parseSuggest(searchParams.get("suggest"));

    if (urlQuery !== query) setQuery(urlQuery);
    if (urlFilters.join(",") !== filters.join(",")) setFilters(urlFilters);
    if (JSON.stringify(urlImdb) !== JSON.stringify(imdbSelection)) {
      setImdbSelection(urlImdb);
    }
    if (JSON.stringify(urlEp) !== JSON.stringify(episodeSelection)) {
      setEpisodeSelection(urlEp);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlSuggest !== imdbMode) setImdbMode(urlSuggest);
    filtersRef.current = urlFilters;
    // Allow state→URL sync in next tick
    setTimeout(() => { syncing.current = false; }, 0);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string, f: string[]) => {
    filtersRef.current = f;
    setPage(1);
    setQuery(q);
    setFilters(f);
  };

  const runImdbQuery = useCallback(
    (selection: ImdbSuggestion | null, episode: EpisodeSelection) => {
      const q = buildQuery(selection, episode);
      if (!q) return;
      const f = filtersRef.current;
      setPage(1);
      setQuery(q);
      setFilters(f);
    },
    [],
  );

  const handleImdbSelect = (selection: ImdbSuggestion | null) => {
    setImdbSelection(selection);
    setEpisodeSelection({ mode: "none" });
  };

  const handleEpisodeChange = (next: EpisodeSelection) => {
    setEpisodeSelection(next);
    if (imdbSelection) runImdbQuery(imdbSelection, next);
  };

  const handleClearImdb = () => {
    setImdbSelection(null);
    setEpisodeSelection({ mode: "none" });
    setClearSignal((n) => n + 1);
  };

  const handleClearSearch = () => {
    setImdbSelection(null);
    setEpisodeSelection({ mode: "none" });
    setQuery("");
    setItems([]);
    setSearchDebug(null);
    setLastSearchApiUrl(null);
    setIsLoading(false);
    setPage(1);
    setClearSignal((n) => n + 1);
  };

  useEffect(() => {
    if (!qbOnline) return;
    libraryFetcher.load("/api/torrents");
  }, [qbOnline]);

  const libraryHashes = useMemo(() => {
    if (!qbOnline) return new Set<string>();
    const data = libraryFetcher.data;
    if (!Array.isArray(data)) return new Set<string>();
    return new Set(data.map((t) => t.hash.toLowerCase()));
  }, [libraryFetcher.data, qbOnline]);

  useEffect(() => {
    if (!query) {
      setItems([]);
      setSearchDebug(null);
      setLastSearchApiUrl(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const params = new URLSearchParams({ query });
    filters.forEach((f) => params.append("filters", f));
    const epCode = encodeEpisodeCode(episodeSelection);
    if (imdbSelection && epCode) {
      params.set("imdb", imdbSelection.id);
      params.set("title", imdbSelection.title);
      params.set("ep", epCode);
    }
    const apiUrl = `/api/search?${params}`;
    setLastSearchApiUrl(apiUrl);
    searchFetcher.load(apiUrl);
  }, [query, filters, imdbSelection?.id, imdbSelection?.title, episodeSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchFetcher.state === "idle" && searchFetcher.data) {
      const { items: nextItems, debug } = unwrapSearchResponse(
        searchFetcher.data,
      );
      setItems(nextItems);
      setSearchDebug(debug);
      setIsLoading(false);
    }
  }, [searchFetcher.state, searchFetcher.data]);

  useEffect(() => {
    if (downloadFetcher.state !== "idle") {
      downloadBusyRef.current = true;
      return;
    }
    if (!downloadBusyRef.current) return;
    downloadBusyRef.current = false;

    const name = pendingDownloadRef.current;
    pendingDownloadRef.current = null;
    if (!name) return;

    const data = downloadFetcher.data;
    const ok =
      data &&
      typeof data === "object" &&
      "status" in data &&
      data.status === "ok";

    if (ok) {
      notifyDownloadStarted(name);
      if (qbOnline) libraryFetcher.load("/api/torrents");
    }
  }, [downloadFetcher.state, downloadFetcher.data]);

  const handleDownload = (hash: string, name: string, imdb?: string) => {
    if (!qbOnline) return;
    const params = new URLSearchParams({ hash, name });
    if (imdb) params.set("imdb", imdb);
    pendingDownloadRef.current = name;
    downloadFetcher.load(`/api/download?${params}`);
  };

  const start = (page - 1) * PPER;
  const imdbId = imdbSelection?.id ?? null;

  const epMode =
    episodeSelection.mode === "episode" ||
    episodeSelection.mode === "season";

  // Show-level IMDb id search: client-filter by imdb tag.
  // Episode/season dual search: trust API merge (name hits may lack imdb).
  const imdbFilterActive =
    !epMode &&
    Boolean(imdbSelection) &&
    (query === imdbSelection!.id ||
      query.startsWith(imdbSelection!.title));

  const filteredItems = useMemo(() => {
    const base = imdbFilterActive
      ? items.filter((item) => item.imdb === imdbId)
      : items;
    return sortSearchItems(base, sortKey, sortDir);
  }, [items, imdbFilterActive, imdbId, sortKey, sortDir]);
  const filteredTotal = filteredItems.length;
  const filteredEnd = Math.min(start + PPER, filteredTotal);
  const filteredTotalPages = Math.max(1, Math.ceil(filteredTotal / PPER));

  // Clamp only after results settle — avoid wiping a restored `page` while items are still empty.
  useEffect(() => {
    if (isLoading || !query) return;
    if (page > filteredTotalPages) setPage(filteredTotalPages);
  }, [page, filteredTotalPages, isLoading, query]);

  const pageItems = filteredItems.slice(start, filteredEnd);

  const filterLabel =
    episodeSelection.mode === "episode"
      ? `${imdbSelection?.title} ${episodeCode(episodeSelection.season, episodeSelection.episode)}`
      : episodeSelection.mode === "season"
        ? `${imdbSelection?.title} ${seasonCode(episodeSelection.season)}`
        : (imdbSelection?.title ?? imdbId);

  const showFilterLabel = Boolean(imdbSelection) && (epMode || imdbFilterActive);

  const hasQueried = Boolean(query);

  return (
    <div>
      <SearchBar
        isLoading={isLoading}
        onSearch={handleSearch}
        onImdbSelect={handleImdbSelect}
        onClear={handleClearSearch}
        clearSignal={clearSignal}
        initialQuery={imdbSelection?.title || query}
        initialImdb={imdbSelection}
        initialFilters={query ? filters : undefined}
        imdbMode={imdbMode}
        onImdbModeChange={setImdbMode}
      />

      <div
        className={
          imdbSelection
            ? // max-content card (poster width); 1fr = results fill remaining page width
              "mt-1 grid grid-cols-1 items-start gap-3 @lg:grid-cols-[minmax(0,max-content)_minmax(0,1fr)]"
            : "mt-1 block"
        }
      >
        {imdbSelection ? (
          <aside className="min-w-0 max-w-full overflow-hidden @lg:sticky @lg:top-20 @lg:max-h-[calc(100vh-5rem)] @lg:self-start">
            <ImdbTitleCard
              selection={imdbSelection}
              episodeSelection={episodeSelection}
              onEpisodeChange={handleEpisodeChange}
              onClear={handleClearImdb}
            />
          </aside>
        ) : null}

        <section className="min-w-0 w-full">
          {hasQueried || items.length > 0 ? (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {isLoading
                    ? "Searching…"
                    : filteredTotal > 0
                      ? `Showing ${start + 1}–${filteredEnd} of ${filteredTotal}`
                      : "No results"}
                  {showFilterLabel && !isLoading ? (
                    <span className="ml-1 text-imdb-foreground">
                      · {filterLabel}
                    </span>
                  ) : null}
                </span>
                {!isLoading && filteredTotal > 0 ? (
                  <SearchSortStrip
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onChange={(key, dir) => {
                      setSortKey(key);
                      setSortDir(dir);
                      setPage(1);
                    }}
                  />
                ) : null}
              </div>

              <SearchResults
                items={pageItems}
                onDownload={handleDownload}
                isLoading={isLoading}
                libraryHashes={libraryHashes}
                qbOnline={qbOnline}
                resultsView={resultsView}
              />

              {filteredTotal > PPER && (
                <Pagination className="mt-3">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: filteredTotalPages }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={page === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(filteredTotalPages, page + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : null}
        </section>
      </div>

      {import.meta.env.DEV ? (
        <SearchDebugPanel
          server={searchDebug}
          client={{
            apiUrl: lastSearchApiUrl,
            imdbId,
            imdbTitle: imdbSelection?.title ?? null,
            episodeLabel: encodeEpisodeCode(episodeSelection),
            imdbFilterActive: Boolean(imdbFilterActive),
            clientFilteredCount: filteredTotal,
            clientTotalCount: items.length,
            isLoading,
          }}
          resultsView={resultsView}
          onResultsViewChange={setResultsView}
        />
      ) : null}
    </div>
  );
}
