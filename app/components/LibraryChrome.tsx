import { SearchIcon } from "lucide-react";

import { FreeSpacePill, useQbFreeSpace } from "@/components/FreeSpacePill";
import { LiquidGlassSurface } from "@/components/liquid-glass/LiquidGlassSurface";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type LibraryFilterId =
  | "all"
  | "downloading"
  | "completed"
  | "active"
  | "paused";

export const LIBRARY_FILTERS: { id: LibraryFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "downloading", label: "Downloading" },
  { id: "completed", label: "Completed" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
];

/** `liquid` = production default. `compact` / `legacy` = Library Debug only. */
export type LibraryChromeView = "liquid" | "compact" | "legacy";

type LibraryChromeProps = {
  filter: LibraryFilterId;
  onFilterChange: (id: LibraryFilterId) => void;
  query: string;
  onQueryChange: (q: string) => void;
  counts: Record<LibraryFilterId, number>;
};

const glassShell = cn(
  "border border-white/20 bg-white/10",
  "shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

function TitleRowAside() {
  const free = useQbFreeSpace();
  if (!free) return null;
  return <FreeSpacePill data={free} className="self-start sm:self-auto" />;
}

function FilterSearchFields({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
}: LibraryChromeProps) {
  return (
    <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
      <label className="relative flex min-w-0 flex-1 items-center">
        <SearchIcon className="pointer-events-none absolute left-3 size-3.5 text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          placeholder="Filter by name, path, or IMDB…"
          className="h-9 w-full rounded-full border-0 bg-transparent pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/35 focus-visible:ring-0"
        />
      </label>
      <div className="flex flex-wrap gap-1 sm:justify-end">
        {LIBRARY_FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              title={`${f.label}: ${counts[f.id]}`}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                on
                  ? "bg-white text-black"
                  : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums text-[0.6rem]",
                  on ? "text-black/55" : "text-white/40",
                )}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LibraryTitleRow({ counts }: { counts: Record<LibraryFilterId, number> }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-base font-semibold tracking-tight">
        Library
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {counts.all} torrents
        </span>
      </h1>
      <TitleRowAside />
    </div>
  );
}

/** Production default: liquid-glass search + filter pills. */
function LibraryChromeLiquid(props: LibraryChromeProps) {
  return (
    <>
      <LibraryTitleRow counts={props.counts} />
      <div className="sticky top-16 z-40 -mx-4 px-4 py-2">
        <LiquidGlassSurface
          radius={22}
          className="border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        >
          <FilterSearchFields {...props} />
        </LiquidGlassSurface>
      </div>
    </>
  );
}

/** Previous frosted glass bar — Library Debug only. */
function LibraryChromeCompact(props: LibraryChromeProps) {
  return (
    <>
      <LibraryTitleRow counts={props.counts} />
      <div className="sticky top-16 z-40 -mx-4 px-4 py-2">
        <div className={cn("rounded-[1.35rem]", glassShell)}>
          <FilterSearchFields {...props} />
        </div>
      </div>
    </>
  );
}

/** Previous header + bordered filter chips + Input. */
function LibraryChromeLegacy({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
}: LibraryChromeProps) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Library</h1>
          <p className="text-xs text-muted-foreground">
            All downloads from qBittorrent — active and finished.
          </p>
        </div>
        <TitleRowAside />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {LIBRARY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[0.625rem] tabular-nums",
                  filter === f.id
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <Input
          type="search"
          placeholder="Filter by name, path, or IMDB…"
          value={query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          className="sm:max-w-64"
        />
      </div>
    </>
  );
}

export function LibraryChrome({
  view,
  ...props
}: LibraryChromeProps & { view: LibraryChromeView }) {
  if (view === "legacy") return <LibraryChromeLegacy {...props} />;
  if (view === "compact") return <LibraryChromeCompact {...props} />;
  return <LibraryChromeLiquid {...props} />;
}
