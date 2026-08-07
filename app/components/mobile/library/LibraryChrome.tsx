import { useEffect, useRef, useState } from "react";
import { ListFilterIcon, SearchIcon } from "lucide-react";

import {
  LIBRARY_FILTER_ICONS,
  LIBRARY_FILTERS,
  libraryChromeDenseGlass,
  libraryChromeGlass,
  type LibraryChromeProps,
} from "@/components/shared/library/chrome";
import { TitleRowAside } from "@/components/shared/library/TitleRowAside";
import { cn } from "@/lib/utils";

function MobileStatusMenu({
  filter,
  onFilterChange,
  counts,
}: {
  filter: LibraryChromeProps["filter"];
  onFilterChange: LibraryChromeProps["onFilterChange"];
  counts: LibraryChromeProps["counts"];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = LIBRARY_FILTERS.find((f) => f.id === filter)!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Filter: ${current.label}`}
        title={`${current.label}: ${counts[filter]}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
          open
            ? "bg-white/20 text-white"
            : "text-white/50 hover:bg-white/10 hover:text-white/85",
        )}
      >
        <ListFilterIcon className="size-3.5" />
        {filter !== "all" ? (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-400" />
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            libraryChromeDenseGlass,
            "absolute top-[calc(100%+0.5rem)] right-0 z-50 w-44 overflow-hidden p-1.5 text-white",
          )}
          role="listbox"
          aria-label="Torrent status filter"
        >
          <div className="px-1.5 pt-0.5 pb-1 text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
            Status
          </div>
          <div className="flex flex-col gap-0.5">
            {LIBRARY_FILTERS.map((f) => {
              const on = filter === f.id;
              const Icon = LIBRARY_FILTER_ICONS[f.id];
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onFilterChange(f.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    on ? "bg-white/15" : "hover:bg-white/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      on ? "text-white" : "text-white/45",
                    )}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[0.625rem]",
                      on ? "text-white/90" : "text-white/70",
                    )}
                  >
                    {f.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-[0.5625rem] text-white/40">
                    {counts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Mobile: same slim pill search as desktop. */
export function LibraryChrome({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
}: LibraryChromeProps) {
  return (
    <>
      <div className="flex flex-col gap-2 @sm:flex-row @sm:items-center @sm:justify-between">
        <h1 className="text-base font-semibold tracking-tight">
          Library
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {counts.all} torrents
          </span>
        </h1>
        <TitleRowAside />
      </div>
      <div className="sticky top-2 z-40 -mx-4 px-4 py-2">
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-full py-0.5 pr-0.5 pl-1",
            libraryChromeGlass,
          )}
        >
          <label className="relative flex min-w-0 flex-1 items-center">
            <SearchIcon className="pointer-events-none absolute left-2.5 size-3.5 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.currentTarget.value)}
              placeholder="Filter library…"
              className="h-8 w-full rounded-full border-0 bg-transparent pl-8 pr-2 text-[0.6875rem] text-white outline-none placeholder:text-white/35 focus-visible:ring-0"
            />
          </label>
          <MobileStatusMenu
            filter={filter}
            onFilterChange={onFilterChange}
            counts={counts}
          />
        </div>
      </div>
    </>
  );
}
