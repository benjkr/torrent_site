import { useState, type ReactNode } from "react";
import { BugIcon, CopyIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  SearchResultsMeta,
  SearchResultsRows,
  SearchResultsView,
} from "@/components/SearchResultsTable";
import type {
  SearchBarChrome,
  SearchFiltersStyle,
  SearchDrawerHeight,
} from "@/components/SearchBar";
import type { TorrentFilesViewerStyle } from "@/components/TorrentFilesHoverCard";
import type {
  EpisodeGraphAnim,
  EpisodeGraphFit,
  ShowViewerStyle,
} from "@/components/ImdbTitleCard";
import { cn } from "@/lib/utils";
import type { SearchDebugInfo } from "@/lib/types";

export interface SearchClientDebug {
  apiUrl: string | null;
  imdbId: string | null;
  imdbTitle: string | null;
  episodeLabel: string | null;
  imdbFilterActive: boolean;
  clientFilteredCount: number;
  clientTotalCount: number;
  isLoading: boolean;
}

interface SearchDebugPanelProps {
  server: SearchDebugInfo | null;
  client: SearchClientDebug;
  resultsView: SearchResultsView;
  onResultsViewChange: (v: SearchResultsView) => void;
  resultsRows: SearchResultsRows;
  onResultsRowsChange: (v: SearchResultsRows) => void;
  resultsMeta: SearchResultsMeta;
  onResultsMetaChange: (v: SearchResultsMeta) => void;
  filesViewerStyle: TorrentFilesViewerStyle;
  onFilesViewerStyleChange: (v: TorrentFilesViewerStyle) => void;
  barChrome: SearchBarChrome;
  onBarChromeChange: (v: SearchBarChrome) => void;
  filtersStyle: SearchFiltersStyle;
  onFiltersStyleChange: (v: SearchFiltersStyle) => void;
  drawerHeight: SearchDrawerHeight;
  onDrawerHeightChange: (v: SearchDrawerHeight) => void;
  showViewer: ShowViewerStyle;
  onShowViewerChange: (v: ShowViewerStyle) => void;
  episodeGraphFit: EpisodeGraphFit;
  onEpisodeGraphFitChange: (v: EpisodeGraphFit) => void;
  episodeGraphAnim: EpisodeGraphAnim;
  onEpisodeGraphAnimChange: (v: EpisodeGraphAnim) => void;
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const text = JSON.stringify(value, null, 2) ?? "null";

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-6 gap-1 px-1.5 text-[0.625rem]"
          onClick={() => void navigator.clipboard.writeText(text)}
          title="Copy JSON"
        >
          <CopyIcon className="size-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/40 p-2 text-[0.625rem] leading-relaxed text-foreground/90">
        {text}
      </pre>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 text-[0.6875rem]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-medium text-foreground/90">
        {children}
      </dd>
    </div>
  );
}

export default function SearchDebugPanel({
  server,
  client,
  resultsView,
  onResultsViewChange,
  resultsRows,
  onResultsRowsChange,
  resultsMeta,
  onResultsMetaChange,
  filesViewerStyle,
  onFilesViewerStyleChange,
  barChrome,
  onBarChromeChange,
  filtersStyle,
  onFiltersStyleChange,
  drawerHeight,
  onDrawerHeightChange,
  showViewer,
  onShowViewerChange,
  episodeGraphFit,
  onEpisodeGraphFitChange,
  episodeGraphAnim,
  onEpisodeGraphAnimChange,
}: SearchDebugPanelProps) {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "fixed bottom-4 right-4 z-[60] gap-1.5 shadow-lg",
          open && "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <BugIcon className="size-3.5" />
        Debug
      </Button>

      {open ? (
        <div
          className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
          role="dialog"
          aria-label="Search debug"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <BugIcon className="size-4 text-muted-foreground" />
              Search debug
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <XIcon />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
            <section className="flex items-center justify-between gap-3">
              <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Show
              </h3>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(
                  [
                    {
                      id: "marquee" as const,
                      label: "Marquee",
                      hint: "Footer · Underline chart, sticky full-height (default)",
                    },
                    {
                      id: "classic" as const,
                      label: "Classic",
                      hint: "Previous narrow poster + green episode grid",
                    },
                  ] as const
                ).map((opt) => {
                  const on = showViewer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      onClick={() => onShowViewerChange(opt.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                        on
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {showViewer === "marquee" ? (
              <>
                <section className="flex items-center justify-between gap-3">
                  <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ep graph
                  </h3>
                  <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                    {(
                      [
                        {
                          id: "stretch" as const,
                          label: "Stretch",
                          hint: "Grow only if bars would leave empty space; else keep w-7 (default)",
                        },
                        {
                          id: "fixed" as const,
                          label: "Fixed",
                          hint: "Always equal w-7 bars; empty space when few episodes",
                        },
                      ] as const
                    ).map((opt) => {
                      const on = episodeGraphFit === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.hint}
                          onClick={() => onEpisodeGraphFitChange(opt.id)}
                          className={cn(
                            "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                            on
                              ? "bg-foreground text-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex items-center justify-between gap-3">
                  <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ep anim
                  </h3>
                  <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                    {(
                      [
                        {
                          id: "raise" as const,
                          label: "Raise",
                          hint: "Staggered bars rise to height on season change (default)",
                        },
                        {
                          id: "off" as const,
                          label: "Off",
                          hint: "Prior instant bars, no entrance animation",
                        },
                      ] as const
                    ).map((opt) => {
                      const on = episodeGraphAnim === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.hint}
                          onClick={() => onEpisodeGraphAnimChange(opt.id)}
                          className={cn(
                            "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                            on
                              ? "bg-foreground text-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : null}

            <section className="flex items-center justify-between gap-3">
              <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Bar
              </h3>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(
                  [
                    {
                      id: "ghost" as const,
                      label: "Ghost",
                      hint: "Chrome · Ghost capsule + split drawer (default)",
                    },
                    {
                      id: "classic" as const,
                      label: "Classic",
                      hint: "Previous island + Search button + IMDb in drawer",
                    },
                  ] as const
                ).map((opt) => {
                  const on = barChrome === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      onClick={() => onBarChromeChange(opt.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                        on
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {barChrome === "classic" ? (
              <>
            <section className="flex items-center justify-between gap-3">
              <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Filters
              </h3>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(
                  [
                    {
                      id: "drawer" as const,
                      label: "Drawer",
                      hint: "Soft-pill strip in slight-inset black drawer (default)",
                    },
                    {
                      id: "legacy" as const,
                      label: "Legacy",
                      hint: "Previous floating glass dock pills",
                    },
                  ] as const
                ).map((opt) => {
                  const on = filtersStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      onClick={() => onFiltersStyleChange(opt.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                        on
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {filtersStyle === "drawer" ? (
              <section className="flex items-center justify-between gap-3">
                <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Drawer
                </h3>
                <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                  {(
                    [
                      {
                        id: "tight" as const,
                        label: "Tight",
                        hint: "Locked h-7 chips, lighter tuck (default)",
                      },
                      {
                        id: "tall" as const,
                        label: "Tall",
                        hint: "Previous roomier drawer padding",
                      },
                    ] as const
                  ).map((opt) => {
                    const on = drawerHeight === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.hint}
                        onClick={() => onDrawerHeightChange(opt.id)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                          on
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
              </>
            ) : null}

            <section className="flex items-center justify-between gap-3">
              <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Results
              </h3>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(
                  [
                    {
                      id: "dense" as const,
                      label: "Dense",
                      hint: "A2 icon-row layout (production default)",
                    },
                    {
                      id: "legacy" as const,
                      label: "Legacy",
                      hint: "Previous card layout with tags and health chrome",
                    },
                  ] as const
                ).map((opt) => {
                  const on = resultsView === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      onClick={() => onResultsViewChange(opt.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                        on
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {resultsView === "dense" ? (
              <section className="flex items-center justify-between gap-3">
                <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Rows
                </h3>
                <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                  {(
                    [
                      {
                        id: "separated" as const,
                        label: "Separated",
                        hint: "Gapped rows inside a results container (default)",
                      },
                      {
                        id: "flush" as const,
                        label: "Flush",
                        hint: "Previous stacked border-b rows",
                      },
                    ] as const
                  ).map((opt) => {
                    const on = resultsRows === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.hint}
                        onClick={() => onResultsRowsChange(opt.id)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                          on
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {resultsView === "dense" ? (
              <section className="flex items-center justify-between gap-3">
                <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Meta
                </h3>
                <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                  {(
                    [
                      {
                        id: "dot-rail" as const,
                        label: "Dot rail",
                        hint: "· separators; seeders + leechers merged (default)",
                      },
                      {
                        id: "plain" as const,
                        label: "Plain",
                        hint: "Previous tight icon row with separate peers",
                      },
                    ] as const
                  ).map((opt) => {
                    const on = resultsMeta === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.hint}
                        onClick={() => onResultsMetaChange(opt.id)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                          on
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="flex items-center justify-between gap-3">
              <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                File viewer
              </h3>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(
                  [
                    {
                      id: "dense-glass" as const,
                      label: "Dense glass",
                      hint: "A2 frosted dense file list (production default)",
                    },
                    {
                      id: "legacy" as const,
                      label: "Legacy",
                      hint: "Previous flat popover file list",
                    },
                  ] as const
                ).map((opt) => {
                  const on = filesViewerStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      onClick={() => onFilesViewerStyleChange(opt.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                        on
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Request
              </h3>
              <dl className="space-y-1.5">
                <Row label="Query">{server?.query ?? "—"}</Row>
                <Row label="Filters">
                  {server?.filters?.length
                    ? server.filters.join(", ")
                    : "none"}
                </Row>
                <Row label="API URL">{client.apiUrl ?? "—"}</Row>
                <Row label="Fetched">
                  {server
                    ? `${server.fetchedAt} · ${server.durationMs}ms`
                    : client.isLoading
                      ? "Loading…"
                      : "—"}
                </Row>
              </dl>
            </section>

            {server?.queries?.length ? (
              <section className="space-y-2">
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apibay queries
                </h3>
                <ul className="space-y-2">
                  {server.queries.map((branch) => (
                    <li
                      key={branch.url + branch.label}
                      className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[0.6875rem]"
                    >
                      <div className="font-medium text-foreground/90">
                        {branch.label}
                      </div>
                      <a
                        href={branch.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block break-all text-imdb-foreground underline-offset-2 hover:underline"
                      >
                        {branch.url}
                      </a>
                      <div className="mt-1 text-muted-foreground">
                        raw {branch.rawCount} · after {branch.afterFilterCount}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apibay
                </h3>
                <dl className="space-y-1.5">
                  <Row label="URL">
                    {server?.apibayUrl ? (
                      <a
                        href={server.apibayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-imdb-foreground underline-offset-2 hover:underline"
                      >
                        {server.apibayUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Row>
                </dl>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Counts
              </h3>
              <dl className="space-y-1.5">
                <Row label="Raw">{server?.rawCount ?? "—"}</Row>
                <Row label="Merged">
                  {server?.afterFilterCount ?? "—"}
                </Row>
                <Row label="Returned">{server?.returnedCount ?? "—"}</Row>
                <Row label="Client IMDb">
                  {client.imdbFilterActive
                    ? `${client.clientFilteredCount} / ${client.clientTotalCount}`
                    : `${client.clientTotalCount} (no IMDb filter)`}
                </Row>
              </dl>
            </section>

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Client context
              </h3>
              <dl className="space-y-1.5">
                <Row label="IMDb">
                  {client.imdbId
                    ? `${client.imdbTitle ?? "?"} (${client.imdbId})`
                    : "—"}
                </Row>
                <Row label="Episode">{client.episodeLabel ?? "—"}</Row>
                <Row label="IMDb filter">
                  {client.imdbFilterActive ? "on" : "off"}
                </Row>
              </dl>
            </section>

            <JsonBlock label="Raw apibay rows" value={server?.raw ?? []} />
            <JsonBlock
              label="Filtered (pre-slice)"
              value={server?.filtered ?? []}
            />
            <JsonBlock
              label="Returned items"
              value={
                server
                  ? server.filtered.slice(0, server.returnedCount)
                  : []
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
