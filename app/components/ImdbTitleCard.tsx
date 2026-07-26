import { useEffect, useState } from "react";
import {
  ClapperboardIcon,
  FilmIcon,
  StarIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { episodeCode, seasonCode } from "@/lib/imdb";
import type { ImdbSuggestion, TvShowPayload } from "@/lib/types";

export type EpisodeSelection =
  | { mode: "none" }
  | { mode: "season"; season: number }
  | { mode: "episode"; season: number; episode: number };

interface ImdbTitleCardProps {
  selection: ImdbSuggestion;
  episodeSelection: EpisodeSelection;
  onEpisodeChange: (next: EpisodeSelection) => void;
  onClear: () => void;
}

interface EpisodeRatingStyle {
  button: string;
  ratingText: string;
}

function episodeRatingStyle(
  rating: number | null,
  selected: boolean,
): EpisodeRatingStyle {
  if (selected) {
    return { button: "", ratingText: "text-white/85" };
  }

  if (rating == null) {
    return {
      button:
        "border-border/80 bg-muted/40 text-foreground/80 hover:bg-muted/55",
      ratingText: "text-muted-foreground",
    };
  }

  // Soft translucent fills + theme-aware text so ratings stay readable on dark cards.
  if (rating < 4) {
    return {
      button:
        "border-red-500/40 bg-red-500/15 text-red-700 hover:bg-red-500/22 dark:border-red-400/35 dark:bg-red-500/12 dark:text-red-300 dark:hover:bg-red-500/18",
      ratingText: "text-red-600 dark:text-red-400",
    };
  }

  if (rating < 5) {
    return {
      button:
        "border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/16 dark:border-red-400/28 dark:bg-red-500/10 dark:text-red-300/90 dark:hover:bg-red-500/15",
      ratingText: "text-red-600/90 dark:text-red-400/85",
    };
  }

  if (rating < 6) {
    return {
      button:
        "border-red-400/25 bg-red-500/8 text-red-700/90 hover:bg-red-500/14 dark:border-red-400/22 dark:bg-red-500/8 dark:text-red-300/80 dark:hover:bg-red-500/12",
      ratingText: "text-red-600/80 dark:text-red-400/70",
    };
  }

  if (rating < 7) {
    return {
      button:
        "border-border/80 bg-muted/50 text-foreground/75 hover:bg-muted/65",
      ratingText: "text-muted-foreground",
    };
  }

  if (rating < 8) {
    return {
      button:
        "border-amber-500/25 bg-amber-500/10 text-amber-800 hover:bg-amber-500/16 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/16",
      ratingText: "text-amber-700 dark:text-amber-400/90",
    };
  }

  if (rating < 8.5) {
    return {
      button:
        "border-amber-500/35 bg-amber-500/16 text-amber-800 hover:bg-amber-500/22 dark:border-amber-400/40 dark:bg-amber-400/16 dark:text-amber-100 dark:hover:bg-amber-400/22",
      ratingText: "text-amber-700 dark:text-amber-300",
    };
  }

  if (rating < 9) {
    return {
      button:
        "border-amber-500/45 bg-amber-500/22 text-amber-900 hover:bg-amber-500/28 dark:border-amber-400/50 dark:bg-amber-400/22 dark:text-amber-50 dark:hover:bg-amber-400/28",
      ratingText: "text-amber-800 dark:text-amber-200",
    };
  }

  if (rating < 9.5) {
    return {
      button:
        "border-amber-500/55 bg-amber-500/28 text-amber-950 hover:bg-amber-500/34 dark:border-imdb/55 dark:bg-imdb/28 dark:text-imdb-on dark:hover:bg-imdb/34",
      ratingText: "text-amber-900 dark:text-imdb-foreground font-medium",
    };
  }

  return {
    button:
      "border-amber-500/65 bg-amber-500/36 text-amber-950 hover:bg-amber-500/42 dark:border-imdb/70 dark:bg-imdb/40 dark:text-imdb-on dark:hover:bg-imdb/48",
    ratingText: "text-amber-950 font-semibold dark:text-imdb-on",
  };
}

export default function ImdbTitleCard({
  selection,
  episodeSelection,
  onEpisodeChange,
  onClear,
}: ImdbTitleCardProps) {
  const [show, setShow] = useState<TvShowPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShow(null);
    setLoading(true);

    fetch(`/api/tv_show?imdb=${encodeURIComponent(selection.id)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as TvShowPayload;
      })
      .then((data) => {
        if (!cancelled) setShow(data);
      })
      .catch(() => {
        if (!cancelled) setShow(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection.id]);

  const isSeries =
    show?.kind === "series" ||
    (selection.type === "series" && show?.kind !== "movie");

  const seasons = show?.seasons ?? [];
  const cover = selection.image || show?.image || null;
  const title = selection.title || show?.title || selection.id;
  const year = selection.year ?? show?.year;
  const stars = selection.stars || show?.stars || "";
  const rating = show?.rating;
  const genres = show?.genres ?? [];
  const status = show?.status;

  const activeLabel =
    episodeSelection.mode === "episode"
      ? episodeCode(episodeSelection.season, episodeSelection.episode)
      : episodeSelection.mode === "season"
        ? seasonCode(episodeSelection.season)
        : null;

  const totalEps = seasons.reduce((n, s) => n + s.episodes.length, 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-black/5 h-[calc(100vh-5rem)]">
      {/* Header: poster left · info right */}
      <div className="relative flex gap-3 p-3">
        <div className="relative h-28 w-[4.75rem] shrink-0 overflow-hidden rounded-lg bg-muted shadow-inner sm:h-32 sm:w-[5.25rem]">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground/35">
              <FilmIcon className="size-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 self-center">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight tracking-tight sm:text-[0.9375rem]">
                {title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.6875rem] text-muted-foreground">
                <span className="inline-flex items-center rounded bg-imdb-soft px-1.5 py-px text-[0.5625rem] font-extrabold tracking-tight text-imdb-foreground">
                  IMDb
                </span>
                <span>
                  {isSeries
                    ? "Series"
                    : selection.type === "movie" || show?.kind === "movie"
                      ? "Movie"
                      : "Title"}
                </span>
                {year != null ? <span>· {year}</span> : null}
                {rating != null ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                    <StarIcon className="size-3 fill-amber-500 text-amber-500" />
                    {rating.toFixed(1)}
                  </span>
                ) : null}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-muted-foreground/80">
                {status ? (
                  <span className="font-medium">{status}</span>
                ) : null}
                {isSeries && seasons.length > 0 ? (
                  <span className="tabular-nums">
                    {seasons.length} season{seasons.length !== 1 ? "s" : ""}
                    {totalEps > 0 ? ` · ${totalEps} eps` : ""}
                  </span>
                ) : null}
                {genres.length > 0 ? (
                  <span>{genres.slice(0, 3).join(" · ")}</span>
                ) : null}
                {stars ? (
                  <span className="truncate">{stars}</span>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onClick={onClear}
              title="Clear selection"
            >
              <XIcon />
            </Button>
          </div>

          {activeLabel ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge className="h-5 gap-1 border-0 bg-emerald-500/15 px-1.5 text-[0.625rem] font-semibold text-emerald-700 dark:text-emerald-400">
                <ClapperboardIcon className="size-2.5" />
                {activeLabel}
              </Badge>
              <button
                type="button"
                className="cursor-pointer text-[0.625rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => onEpisodeChange({ mode: "none" })}
              >
                Clear filter
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Seasons + episodes */}
      {isSeries ? (
        <div className="flex min-h-0 flex-1 flex-col border-t">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
              <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground/60" />
              Loading seasons…
            </div>
          ) : seasons.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No episode data available for this show.
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {seasons.map((s, idx) => {
                const seasonSelected =
                  episodeSelection.mode === "season" &&
                  episodeSelection.season === s.season;
                const seasonLabel =
                  s.season === 0 ? "Specials" : `Season ${s.season}`;
                const code = seasonCode(s.season);

                return (
                  <div
                    key={s.season}
                    className={cn(
                      "px-2.5 py-2",
                      idx > 0 && "border-t border-border/50",
                      seasonSelected && "bg-emerald-500/[0.06]",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[0.6875rem] leading-tight">
                        <span className="font-medium text-foreground/90">
                          {seasonLabel}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {s.episodes.length} ep
                          {s.episodes.length !== 1 ? "s" : ""}
                        </span>
                      </p>
                      <button
                        type="button"
                        title={
                          seasonSelected
                            ? `Clear ${code}`
                            : `Search entire ${code}`
                        }
                        aria-pressed={seasonSelected}
                        onClick={() =>
                          onEpisodeChange(
                            seasonSelected
                              ? { mode: "none" }
                              : { mode: "season", season: s.season },
                          )
                        }
                        className={cn(
                          "shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[0.625rem] font-medium transition-colors",
                          seasonSelected
                            ? "bg-foreground/8 text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {seasonSelected ? `Clear ${code}` : `All ${code}`}
                      </button>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1">
                      {s.episodes.map((ep) => {
                        const epCode = episodeCode(s.season, ep.number);
                        const selected =
                          episodeSelection.mode === "episode" &&
                          episodeSelection.season === s.season &&
                          episodeSelection.episode === ep.number;
                        const ratingLabel =
                          ep.rating != null
                            ? `IMDb ${ep.rating.toFixed(1)}`
                            : null;
                        const ratingStyle = episodeRatingStyle(ep.rating, selected);
                        return (
                          <button
                            key={`${s.season}-${ep.number}`}
                            type="button"
                            title={
                              ratingLabel
                                ? `${epCode} — ${ep.name} · ${ratingLabel}`
                                : `${epCode} — ${ep.name}`
                            }
                            aria-pressed={selected}
                            onClick={() =>
                              onEpisodeChange(
                                selected
                                  ? { mode: "none" }
                                  : {
                                      mode: "episode",
                                      season: s.season,
                                      episode: ep.number,
                                    },
                              )
                            }
                            className={cn(
                              "relative flex h-8 cursor-pointer flex-col items-center justify-center gap-px rounded-md border transition-all",
                              selected
                                ? "z-[1] scale-[1.04] border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                : cn("hover:shadow-sm", ratingStyle.button),
                            )}
                          >
                            <span className="text-[0.6875rem] font-semibold leading-none tabular-nums">
                              {ep.number}
                            </span>
                            {ep.rating != null ? (
                              <span
                                className={cn(
                                  "text-[0.5rem] font-medium leading-none tabular-nums",
                                  ratingStyle.ratingText,
                                )}
                              >
                                {ep.rating.toFixed(1)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
