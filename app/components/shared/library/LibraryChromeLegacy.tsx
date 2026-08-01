import { FreeSpacePill, useQbFreeSpace } from "@/components/shared/FreeSpacePill";
import { Input } from "@/components/ui/input";
import {
  LIBRARY_FILTERS,
  type LibraryChromeProps,
} from "@/components/shared/library/chrome";
import { cn } from "@/lib/utils";

export function TitleRowAside() {
  const free = useQbFreeSpace();
  if (!free) return null;
  return <FreeSpacePill data={free} className="self-start @sm:self-auto" />;
}

/** Previous header + bordered filter chips + Input (debug legacy). */
export function LibraryChromeLegacy({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
}: LibraryChromeProps) {
  return (
    <>
      <div className="flex flex-col gap-3 @sm:flex-row @sm:items-center @sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Library</h1>
          <p className="text-xs text-muted-foreground">
            All downloads from qBittorrent — active and finished.
          </p>
        </div>
        <TitleRowAside />
      </div>

      <div className="flex flex-col gap-2 @sm:flex-row @sm:items-center @sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {LIBRARY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 text-[0.625rem]",
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
          className="@sm:max-w-64"
        />
      </div>
    </>
  );
}
