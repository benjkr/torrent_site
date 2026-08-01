import { SearchIcon, XIcon } from "lucide-react";

import {
  FilterDivider,
  ImdbLogoToggle,
  SEARCH_RESOLUTIONS,
  SEARCH_SOURCES,
  SearchBarShell,
  SuggestionList,
  searchGhostChip,
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
    setFiltersOpen,
    formRef,
    select,
    submit,
    clear,
  } = useSearchBarState(props);

  const { isLoading = false } = props;

  const resolutionToggles = SEARCH_RESOLUTIONS.map((f) => {
    const on = active.has(f);
    return (
      <button
        key={f}
        type="button"
        onClick={() => toggle(f)}
        className={cn(
          searchGhostChip,
          on
            ? "bg-white text-black"
            : "text-white/45 hover:bg-white/8 hover:text-white/75",
        )}
      >
        {f}
      </button>
    );
  });

  const sourceToggles = SEARCH_SOURCES.map((f) => {
    const on = active.has(f);
    return (
      <button
        key={f}
        type="button"
        onClick={() => toggle(f)}
        className={cn(
          searchGhostChip,
          on
            ? "bg-imdb/25 text-imdb"
            : "text-white/45 hover:bg-white/8 hover:text-white/75",
        )}
      >
        {f}
      </button>
    );
  });

  return (
    <SearchBarShell
      formRef={formRef}
      onSubmit={submit}
      imdbMode={imdbMode}
      afterBar={
        <>
          {imdbMode && suggestOpen ? (
            <SuggestionList suggestions={suggestions} onSelect={select} />
          ) : null}
          <div className="mx-auto" style={{ maxWidth: 688 }}>
            <div
              className={cn(
                "relative overflow-hidden border border-t-0 border-white/10 bg-[#0a0a0a]",
                "shadow-[0_20px_50px_rgba(0,0,0,0.55)]",
                "-mt-1.5 rounded-b-[1.25rem] px-3 py-2.5",
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent"
              />
              <div className="flex flex-wrap items-center justify-center gap-1">
                {resolutionToggles}
                <FilterDivider />
                {sourceToggles}
              </div>
            </div>
          </div>
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
          <ImdbLogoToggle
            on={imdbMode}
            onClick={() => setImdbMode((v) => !v)}
          />
        </div>
      </div>
    </SearchBarShell>
  );
}
