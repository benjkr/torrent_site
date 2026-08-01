import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import {
  ImdbMark,
  SEARCH_RESOLUTIONS,
  SEARCH_SOURCES,
  SearchBarShell,
  SuggestionList,
  UnderlineFilterGroup,
  searchDenseGlass,
  searchIslandShell,
  useSearchBarState,
  type SearchBarProps,
} from "@/components/shared/search/searchBarShared";
import { cn } from "@/lib/utils";

export default function SearchBar(props: SearchBarProps) {
  const {
    text,
    setText,
    userEdited,
    active,
    toggle,
    imdbMode,
    setImdbMode,
    suggestions,
    suggestOpen,
    setSuggestOpen,
    filtersOpen,
    setFiltersOpen,
    formRef,
    select,
    submit,
    clear,
  } = useSearchBarState(props);

  const { isLoading = false } = props;

  return (
    <SearchBarShell
      formRef={formRef}
      onSubmit={submit}
      imdbMode={imdbMode}
      afterBar={
        <>
          {filtersOpen ? (
            <div
              className={cn(
                searchDenseGlass,
                "relative z-50 mt-2 space-y-3 p-2.5 text-white",
              )}
            >
              <div className="space-y-3 px-1">
                <UnderlineFilterGroup
                  label="Resolution"
                  options={SEARCH_RESOLUTIONS}
                  active={active}
                  onToggle={toggle}
                />
                <UnderlineFilterGroup
                  label="Source"
                  options={SEARCH_SOURCES}
                  active={active}
                  onToggle={toggle}
                  accent="imdb"
                />
              </div>
              <div className="h-px bg-white/10" />
              <button
                type="button"
                onClick={() => setImdbMode((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-white/10"
              >
                <span className="flex items-center gap-2 text-xs text-white/90">
                  <ImdbMark on={imdbMode} />
                  IMDb search
                </span>
                <span
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    imdbMode ? "bg-imdb/80" : "bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                      imdbMode ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </span>
              </button>
            </div>
          ) : null}

          {imdbMode && suggestOpen ? (
            <SuggestionList suggestions={suggestions} onSelect={select} />
          ) : null}
        </>
      }
    >
      <div className={cn(searchIslandShell, "rounded-full")}>
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="submit"
            title="Search"
            disabled={isLoading}
            className="ml-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center text-white/55 transition-colors hover:text-white disabled:opacity-60"
          >
            <SearchIcon className="size-4" strokeWidth={1.75} />
          </button>
          <input
            type="text"
            placeholder={
              imdbMode ? "Search movies and series…" : "Search torrents…"
            }
            value={text}
            onChange={(e) => {
              userEdited.current = true;
              setText(e.currentTarget.value);
            }}
            onFocus={() => {
              if (imdbMode && suggestions.length > 0) {
                setSuggestOpen(true);
                setFiltersOpen(false);
              }
            }}
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/35"
          />
          {text && !isLoading ? (
            <button
              type="button"
              onClick={clear}
              title="Clear"
              className="cursor-pointer rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Filters"
            aria-expanded={filtersOpen}
            title="Filters"
            onClick={() => {
              setFiltersOpen((v) => !v);
              setSuggestOpen(false);
            }}
            className={cn(
              "mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
              filtersOpen
                ? "bg-white/20 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white/85",
            )}
          >
            <SlidersHorizontalIcon className="size-4" />
          </button>
        </div>
      </div>
    </SearchBarShell>
  );
}
