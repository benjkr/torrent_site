import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ImdbSuggestion } from "@/lib/types";

const RESOLUTIONS = ["720p", "1080p", "2160p"] as const;
const SOURCES = ["BluRay", "WEBRip"] as const;

interface SearchBarProps {
  onSearch: (query: string, filters: string[]) => void;
  onImdbSelect?: (selection: ImdbSuggestion | null) => void;
  /** Clear search text + related parent state (X button). */
  onClear?: () => void;
  /** Increment to clear the current IMDB selection from outside */
  clearSignal?: number;
  isLoading?: boolean;
  initialQuery?: string;
  initialImdb?: ImdbSuggestion | null;
  /** Applied filters from URL/parent. When omitted (no active query), default to 1080p. */
  initialFilters?: string[];
  imdbMode?: boolean;
  onImdbModeChange?: (enabled: boolean) => void;
}

const islandShell = cn(
  "relative overflow-hidden border border-white/20",
  "bg-linear-to-b from-white/14 to-white/6",
  "shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

function FilterDivider() {
  return (
    <span className="mx-1 h-4 w-px shrink-0 self-center bg-white/12" />
  );
}

function filtersKey(filters: string[] | undefined): string {
  return filters === undefined ? "__default__" : filters.slice().sort().join("\0");
}

function ImdbLogoToggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? "IMDb on" : "IMDb off"}
      onClick={onClick}
      className={cn(
        "mr-1.5 inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-1.5",
        "transition-opacity hover:opacity-90",
      )}
    >
      <img
        src="/imdb-logo.svg"
        alt="IMDb"
        className={cn(
          "h-5 w-auto cursor-pointer select-none transition-[filter,opacity]",
          on ? "opacity-100" : "opacity-70 grayscale contrast-125",
        )}
        draggable={false}
      />
    </button>
  );
}

const ghostChip =
  "inline-flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-full px-2 text-[0.625rem] font-medium transition-colors";

export default function SearchBar({
  onSearch,
  onImdbSelect,
  onClear,
  clearSignal = 0,
  isLoading = false,
  initialQuery = "",
  initialImdb = null,
  initialFilters,
  imdbMode: imdbModeProp,
  onImdbModeChange,
}: SearchBarProps) {
  const [text, setText] = useState<string>(initialQuery);
  const [active, setActive] = useState<Set<string>>(
    () => new Set(initialFilters ?? ["1080p"]),
  );
  const [imdbModeLocal, setImdbModeLocal] = useState(true);
  const imdbMode = imdbModeProp ?? imdbModeLocal;
  const setImdbMode = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(imdbMode) : next;
    if (onImdbModeChange) onImdbModeChange(value);
    else setImdbModeLocal(value);
  };
  const [suggestions, setSuggestions] = useState<ImdbSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedImdb, setSelectedImdb] = useState<ImdbSuggestion | null>(
    initialImdb,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const justSelected = useRef(false);
  const userEdited = useRef(!initialQuery && !initialImdb);

  // Rehydrate from URL / parent when applied search state changes (not draft toggles).
  useEffect(() => {
    setText(initialQuery);
    userEdited.current = false;
  }, [initialQuery]);

  useEffect(() => {
    setSelectedImdb(initialImdb);
  }, [initialImdb]);

  const appliedFiltersKey = filtersKey(initialFilters);
  useEffect(() => {
    if (initialFilters === undefined) {
      setActive(new Set(["1080p"]));
      return;
    }
    setActive(new Set(initialFilters));
  }, [appliedFiltersKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (f: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/imdb_search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as ImdbSuggestion[];
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (clearSignal <= 0) return;
    setSelectedImdb(null);
    setSuggestions([]);
    setOpen(false);
  }, [clearSignal]);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (!userEdited.current) return;
    if (!imdbMode) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 250);
    return () => clearTimeout(debounceRef.current);
  }, [text, imdbMode, fetchSuggestions]);

  const runSearch = (query: string) => {
    const q = query.trim();
    if (q.length === 0) return;
    const parts = [...active].sort();
    onSearch(q, parts);
  };

  const select = (s: ImdbSuggestion) => {
    justSelected.current = true;
    setText(s.title);
    setOpen(false);
    setSuggestions([]);
    setSelectedImdb(s);
    onImdbSelect?.(s);
    runSearch(s.id);
  };

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const q =
      selectedImdb && text.trim() === selectedImdb.title
        ? selectedImdb.id
        : text.trim();
    runSearch(q);
  };

  const clear = () => {
    setText("");
    setSuggestions([]);
    setOpen(false);
    setSelectedImdb(null);
    userEdited.current = false;
    if (onClear) onClear();
    else onImdbSelect?.(null);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resolutionToggles = RESOLUTIONS.map((f) => {
    const on = active.has(f);
    return (
      <button
        key={f}
        type="button"
        onClick={() => toggle(f)}
        className={cn(
          ghostChip,
          on
            ? "bg-white text-black"
            : "text-white/45 hover:bg-white/8 hover:text-white/75",
        )}
      >
        {f}
      </button>
    );
  });

  const sourceToggles = SOURCES.map((f) => {
    const on = active.has(f);
    return (
      <button
        key={f}
        type="button"
        onClick={() => toggle(f)}
        className={cn(
          ghostChip,
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
    <form
      ref={formRef}
      onSubmit={submit}
      className="relative mx-auto my-4 w-full px-2"
      style={{ maxWidth: 784 }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-8 rounded-full opacity-50 blur-3xl transition-colors duration-500",
          imdbMode ? "bg-imdb/15" : "bg-white/8",
        )}
      />

      <div className="relative z-10">
        <div className={cn(islandShell, "rounded-full")}>
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
                imdbMode
                  ? "Search movies and series…"
                  : "Search torrents…"
              }
              value={text}
              onChange={(e) => {
                userEdited.current = true;
                setText(e.currentTarget.value);
              }}
              onFocus={() => {
                if (imdbMode && suggestions.length > 0) setOpen(true);
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
      </div>

      {imdbMode && open ? (
        <div
          className={cn(
            "absolute left-2 right-2 z-50 mt-2 overflow-hidden rounded-2xl border border-white/20",
            "bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl",
          )}
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10"
            >
              {s.image ? (
                <img
                  src={s.image}
                  alt=""
                  className="h-11 w-8 shrink-0 rounded object-cover bg-muted"
                />
              ) : (
                <div className="flex h-11 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <SearchIcon className="size-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm leading-tight">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {s.type === "series"
                    ? "Series"
                    : s.type === "movie"
                      ? "Movie"
                      : ""}
                  {s.year ? `${s.type !== "unknown" ? " · " : ""}${s.year}` : ""}
                  {s.stars
                    ? ` · ${s.stars.split(",").slice(0, 2).join(", ")}`
                    : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
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

      <p className="mt-2.5 text-center text-xs text-white/40">
        Press Enter to search. You can paste an info hash to jump directly.
      </p>
    </form>
  );
}
