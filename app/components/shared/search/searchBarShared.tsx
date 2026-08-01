import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ImdbSuggestion } from "@/lib/types";

export const SEARCH_RESOLUTIONS = ["720p", "1080p", "2160p"] as const;
export const SEARCH_SOURCES = ["BluRay", "WEBRip"] as const;

export interface SearchBarProps {
  onSearch: (query: string, filters: string[]) => void;
  onImdbSelect?: (selection: ImdbSuggestion | null) => void;
  onClear?: () => void;
  clearSignal?: number;
  isLoading?: boolean;
  initialQuery?: string;
  initialImdb?: ImdbSuggestion | null;
  initialFilters?: string[];
  imdbMode?: boolean;
  onImdbModeChange?: (enabled: boolean) => void;
}

export const searchIslandShell = cn(
  "relative overflow-hidden border border-white/20",
  "bg-linear-to-b from-white/14 to-white/6",
  "shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

export const searchDenseGlass = cn(
  "rounded-2xl border border-white/20 bg-zinc-900/80",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

export function FilterDivider() {
  return (
    <span className="mx-1 h-4 w-px shrink-0 self-center bg-white/12" />
  );
}

function filtersKey(filters: string[] | undefined): string {
  return filters === undefined ? "__default__" : filters.slice().sort().join("\0");
}

export function ImdbMark({ on }: { on: boolean }) {
  return (
    <img
      src="/imdb-logo.svg"
      alt="IMDb"
      className={cn(
        "h-4 w-auto select-none transition-[filter,opacity]",
        on ? "opacity-100" : "opacity-55 grayscale contrast-125",
      )}
      draggable={false}
    />
  );
}

export function ImdbLogoToggle({
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

export function UnderlineFilterGroup({
  label,
  options,
  active,
  onToggle,
  accent,
}: {
  label: string;
  options: readonly string[];
  active: Set<string>;
  onToggle: (f: string) => void;
  accent?: "imdb";
}) {
  return (
    <div>
      <div className="mb-2 text-[0.5rem] font-medium uppercase tracking-wide text-white/50">
        {label}
      </div>
      <div className="flex flex-wrap items-baseline gap-4">
        {options.map((f) => {
          const on = active.has(f);
          return (
            <button
              key={f}
              type="button"
              onClick={() => onToggle(f)}
              className={cn(
                "relative cursor-pointer pb-1 text-xs font-medium transition-colors",
                on
                  ? accent === "imdb"
                    ? "text-imdb"
                    : "text-white"
                  : "text-white/35 hover:text-white/70",
              )}
            >
              {f}
              {on ? (
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-0.5 rounded-full",
                    accent === "imdb" ? "bg-imdb" : "bg-white",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const searchGhostChip =
  "inline-flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-full px-2 text-[0.625rem] font-medium transition-colors";

export function useSearchBarState({
  onSearch,
  onImdbSelect,
  onClear,
  clearSignal = 0,
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
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedImdb, setSelectedImdb] = useState<ImdbSuggestion | null>(
    initialImdb,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const justSelected = useRef(false);
  const userEdited = useRef(!initialQuery && !initialImdb);

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
      setSuggestOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/imdb_search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as ImdbSuggestion[];
      setSuggestions(data);
      setSuggestOpen(data.length > 0);
      if (data.length > 0) setFiltersOpen(false);
    } catch {
      setSuggestions([]);
      setSuggestOpen(false);
    }
  }, []);

  useEffect(() => {
    if (clearSignal <= 0) return;
    setSelectedImdb(null);
    setSuggestions([]);
    setSuggestOpen(false);
    setFiltersOpen(false);
  }, [clearSignal]);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (!userEdited.current) return;
    if (!imdbMode) {
      setSuggestions([]);
      setSuggestOpen(false);
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
    setSuggestOpen(false);
    setFiltersOpen(false);
    setSuggestions([]);
    setSelectedImdb(s);
    onImdbSelect?.(s);
    runSearch(s.id);
  };

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setFiltersOpen(false);
    setSuggestOpen(false);
    const q =
      selectedImdb && text.trim() === selectedImdb.title
        ? selectedImdb.id
        : text.trim();
    runSearch(q);
  };

  const clear = () => {
    setText("");
    setSuggestions([]);
    setSuggestOpen(false);
    setFiltersOpen(false);
    setSelectedImdb(null);
    userEdited.current = false;
    if (onClear) onClear();
    else onImdbSelect?.(null);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return {
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
  };
}

export function SuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: ImdbSuggestion[];
  onSelect: (s: ImdbSuggestion) => void;
}) {
  return (
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
          onClick={() => onSelect(s)}
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
  );
}

export function SearchBarShell({
  formRef,
  onSubmit,
  imdbMode,
  children,
  afterBar,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  onSubmit: (e?: FormEvent) => void;
  imdbMode: boolean;
  children: ReactNode;
  afterBar?: ReactNode;
}) {
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="relative mx-auto my-4 w-full px-2"
      style={{ maxWidth: 784 }}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <div
            aria-hidden
            className={cn(
              "absolute -inset-8 rounded-full opacity-50 blur-3xl transition-colors duration-500",
              imdbMode ? "bg-imdb/15" : "bg-white/8",
            )}
          />
        </div>
        <div className="relative z-10">{children}</div>
      </div>
      {afterBar}
      <p className="mt-2.5 text-center text-xs text-white/40">
        Press Enter to search. You can paste an info hash to jump directly.
      </p>
    </form>
  );
}
