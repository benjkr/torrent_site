import { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon, FilmIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { episodeCode, seasonCode } from "@/lib/imdb";
import type { ImdbSuggestion, TvSeason, TvShowPayload } from "@/lib/types";

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

function RatingStar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("inline-block shrink-0", className)}
    >
      <path d="M12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72 3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18-1.1 4.72c-.2.86.73 1.54 1.49 1.08l4.15-2.5z" />
    </svg>
  );
}

const glassShell = cn(
  "border border-white/20",
  "bg-linear-to-b from-white/14 to-white/6",
  "shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

function selectionLabel(ep: EpisodeSelection): string | null {
  if (ep.mode === "episode") return episodeCode(ep.season, ep.episode);
  if (ep.mode === "season") return seasonCode(ep.season);
  return null;
}

function seasonAverage(season: TvSeason): number {
  const rated = season.episodes.filter((e) => e.rating != null);
  if (rated.length === 0) return 0;
  return rated.reduce((n, e) => n + (e.rating ?? 0), 0) / rated.length;
}

function barHeightPct(rating: number | null, min = 6.5, max = 10): number {
  if (rating == null) return 20;
  const t = (rating - min) / (max - min);
  return Math.max(18, Math.min(100, t * 100));
}

function UnderlineSelection({
  ep,
  onClear,
}: {
  ep: EpisodeSelection;
  onClear: () => void;
}) {
  const label = selectionLabel(ep);
  const empty = !label;
  return (
    <button
      type="button"
      disabled={empty}
      onClick={onClear}
      title={empty ? undefined : "Clear selection"}
      className={cn(
        "relative ml-auto inline-flex h-6 min-w-[3.5rem] items-center justify-center px-1",
        "text-[0.6875rem] font-semibold tabular-nums transition-colors",
        empty
          ? "cursor-default text-white/25"
          : "cursor-pointer text-imdb hover:text-imdb-hover",
      )}
    >
      {label ?? "—"}
      <span
        className={cn(
          "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full transition-colors",
          empty ? "bg-white/15" : "bg-imdb",
        )}
      />
    </button>
  );
}

function MarqueeViewer({
  selection,
  episodeSelection,
  onEpisodeChange,
  onClear,
  show,
  loading,
}: {
  selection: ImdbSuggestion;
  episodeSelection: EpisodeSelection;
  onEpisodeChange: (next: EpisodeSelection) => void;
  onClear: () => void;
  show: TvShowPayload | null;
  loading: boolean;
}) {
  const seasons = show?.seasons ?? [];
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  useEffect(() => {
    if (seasons.length === 0) {
      setOpenSeason(null);
      return;
    }
    if (
      episodeSelection.mode === "episode" ||
      episodeSelection.mode === "season"
    ) {
      setOpenSeason(episodeSelection.season);
      return;
    }
    setOpenSeason((prev) =>
      prev != null && seasons.some((s) => s.season === prev)
        ? prev
        : seasons[0]!.season,
    );
  }, [seasons, episodeSelection, selection.id]);

  const isSeries =
    show?.kind === "series" ||
    (selection.type === "series" && show?.kind !== "movie");

  const cover = selection.image || show?.image || null;
  const title = selection.title || show?.title || selection.id;
  const year = selection.year ?? show?.year;
  const rating = show?.rating;

  const activeSeason =
    openSeason != null
      ? (seasons.find((s) => s.season === openSeason) ?? null)
      : null;

  const avg = useMemo(
    () => (activeSeason ? seasonAverage(activeSeason) : 0),
    [activeSeason],
  );
  const avgBarPct = barHeightPct(avg);

  const selectedEp =
    episodeSelection.mode === "episode" &&
    activeSeason &&
    episodeSelection.season === activeSeason.season
      ? (activeSeason.episodes.find(
          (e) => e.number === episodeSelection.episode,
        ) ?? null)
      : null;

  // Card width = poster width (2:3). Reserve chart height so the full card fits the viewport.
  // Use a definite (non-%) width so episode `w-max` rows can't cyclic-size the card via fit-content.
  const chartReserve = isSeries ? "12.75rem" : "0px";
  const cardWidth = `calc((100vh - 5rem - ${chartReserve}) * 2 / 3)`;

  return (
    <div
      className={cn(
        glassShell,
        "flex max-h-[calc(100vh-5rem)] min-w-0 max-w-full flex-col overflow-hidden rounded-[1.35rem] text-white",
      )}
      style={{ width: cardWidth }}
    >
      {/* Poster fills card width exactly — 2:3, no side gaps */}
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white/20">
            <FilmIcon className="size-16" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black from-15% via-black/45 to-transparent" />
        <div className="absolute right-1.5 top-1.5 z-10">
          <button
            type="button"
            title="Clear selection"
            onClick={onClear}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-16">
          <p className="text-[0.5625rem] font-medium uppercase tracking-[0.22em] text-imdb">
            {isSeries
              ? "Series"
              : selection.type === "movie" || show?.kind === "movie"
                ? "Movie"
                : "Title"}
            {year != null ? ` · ${year}` : ""}
          </p>
          <h2 className="mt-1 line-clamp-2 font-sans text-lg font-bold leading-normal tracking-tight text-white [overflow-wrap:anywhere] sm:text-xl">
            {title}
          </h2>
          {rating != null ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm leading-none text-amber-400">
              <RatingStar className="size-3.5 shrink-0 text-amber-400" />
              <span className="font-semibold tabular-nums">
                {rating.toFixed(1)}
              </span>
              <span className="text-[0.6875rem] text-white/40">/ 10 IMDb</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chart: fixed height, scrolls horizontally inside poster width */}
      {isSeries ? (
        <div className="flex min-w-0 shrink-0 flex-col border-t border-white/10">
          {loading ? (
            <div className="flex items-center gap-2 px-2.5 py-2.5 text-xs text-white/50">
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              Loading seasons…
            </div>
          ) : seasons.length === 0 ? (
            <p className="px-2.5 py-2.5 text-xs text-white/45">
              No episode data available for this show.
            </p>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-1.5 px-2.5 pt-2">
                <span className="h-3.5 w-1 shrink-0 rounded-sm bg-imdb" />
                <h3 className="flex min-w-0 items-center gap-0.5 text-[0.8125rem] font-semibold tracking-tight">
                  Episodes
                  <ChevronRightIcon className="size-3.5 text-white/40" />
                </h3>
                <UnderlineSelection
                  ep={episodeSelection}
                  onClear={() => onEpisodeChange({ mode: "none" })}
                />
              </div>

              <div className="mt-1 flex min-w-0 max-w-full items-end gap-2.5 overflow-x-auto overscroll-x-contain px-2.5 [contain:inline-size]">
                <span className="shrink-0 pb-1 text-[0.625rem] text-white/45">
                  Season
                </span>
                {seasons.map((s) => {
                  const on = openSeason === s.season;
                  return (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => setOpenSeason(s.season)}
                      className={cn(
                        "relative shrink-0 cursor-pointer pb-1 text-[0.75rem] font-bold tabular-nums transition-colors",
                        on ? "text-white" : "text-white/70 hover:text-white",
                      )}
                    >
                      S{s.season}
                      {on ? (
                        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-sky-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mx-2.5 border-t border-white/10" />

              {activeSeason ? (
                <>
                  <p className="mt-1 px-2.5 text-[0.625rem] text-white/50">
                    <span className="font-medium text-white/70">
                      S{activeSeason.season} Episodes
                    </span>
                    <span className="mx-1 opacity-40">—</span>
                    <RatingStar className="mr-0.5 inline size-2.5 align-[-0.1em] text-imdb" />
                    <span className="font-semibold tabular-nums text-imdb">
                      {avg.toFixed(1)}
                    </span>
                    <span className="ml-1">Average</span>
                  </p>

                  {/* contain:inline-size — overflowing episode bars must not widen the card/column */}
                  <div className="mt-0.5 min-w-0 max-w-full overflow-x-auto overscroll-x-contain px-1.5 pb-0.5 [contain:inline-size]">
                    <div className="relative isolate flex w-max min-w-full flex-col">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-12"
                      >
                        <div
                          className="absolute inset-x-0 border-t border-dashed border-white/35"
                          style={{ bottom: `${avgBarPct}%` }}
                        />
                      </div>
                      <div
                        key={activeSeason.season}
                        className="relative z-10 flex w-full"
                      >
                        {activeSeason.episodes.map((e, i) => {
                          const selected =
                            episodeSelection.mode === "episode" &&
                            episodeSelection.season === activeSeason.season &&
                            episodeSelection.episode === e.number;
                          const h = barHeightPct(e.rating);
                          return (
                            <button
                              key={e.number}
                              type="button"
                              title={
                                e.rating != null
                                  ? `${episodeCode(activeSeason.season, e.number)} — ${e.name} · ${e.rating.toFixed(1)}`
                                  : `${episodeCode(activeSeason.season, e.number)} — ${e.name}`
                              }
                              onClick={() =>
                                onEpisodeChange(
                                  selected
                                    ? { mode: "none" }
                                    : {
                                        mode: "episode",
                                        season: activeSeason.season,
                                        episode: e.number,
                                      },
                                )
                              }
                              className="flex w-7 min-w-7 grow shrink-0 basis-7 cursor-pointer flex-col items-center"
                            >
                              <div className="flex h-12 w-full items-end px-px">
                                <div
                                  className={cn(
                                    "relative z-10 flex w-full origin-bottom flex-col items-center justify-start rounded-t-sm pt-0.5 transition-colors",
                                    "ep-bar-raise",
                                    selected
                                      ? "bg-imdb text-imdb-on"
                                      : "bg-white/15 text-white/90",
                                  )}
                                  style={{
                                    height: `${h}%`,
                                    animationDelay: `${i * 50}ms`,
                                  }}
                                >
                                  <span className="text-[0.5rem] font-semibold tabular-nums leading-none">
                                    {e.rating?.toFixed(1) ?? "—"}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "text-[0.5rem] tabular-nums",
                                  selected
                                    ? "font-bold text-imdb"
                                    : "text-white/45",
                                )}
                              >
                                E{e.number}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 px-2.5">
                    <div className="flex h-7 min-w-0 items-center gap-1 overflow-hidden text-[0.625rem]">
                      {selectedEp ? (
                        <>
                          <span className="shrink-0 font-semibold tabular-nums text-white">
                            {episodeCode(
                              activeSeason.season,
                              selectedEp.number,
                            )}
                          </span>
                          <span className="text-white/30">·</span>
                          <span className="min-w-0 truncate text-white/85">
                            {selectedEp.name}
                          </span>
                          {selectedEp.rating != null ? (
                            <>
                              <span className="text-white/30">·</span>
                              <RatingStar className="size-2.5 shrink-0 text-imdb" />
                              <span className="shrink-0 font-semibold tabular-nums text-imdb">
                                {selectedEp.rating.toFixed(1)}
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-white/35">Select an episode</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end px-2.5 pb-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onEpisodeChange(
                          episodeSelection.mode === "season" &&
                            episodeSelection.season === activeSeason.season
                            ? { mode: "none" }
                            : {
                                mode: "season",
                                season: activeSeason.season,
                              },
                        )
                      }
                      className={cn(
                        "cursor-pointer text-[0.625rem] font-medium text-sky-400 underline-offset-2 hover:underline",
                        episodeSelection.mode === "season" &&
                          episodeSelection.season === activeSeason.season &&
                          "text-imdb",
                      )}
                    >
                      {episodeSelection.mode === "season" &&
                      episodeSelection.season === activeSeason.season
                        ? `Clear ${seasonCode(activeSeason.season)}`
                        : `Search all ${seasonCode(activeSeason.season)}`}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="min-w-0 shrink-0 overflow-y-auto border-t border-white/10 px-2.5 py-2.5 text-[0.6875rem] text-white/55">
          {show?.genres?.length ? (
            <p>{show.genres.slice(0, 4).join(" · ")}</p>
          ) : null}
          {selection.stars || show?.stars ? (
            <p className="mt-1 truncate">{selection.stars || show?.stars}</p>
          ) : null}
          {show?.status ? <p className="mt-1">{show.status}</p> : null}
        </div>
      )}
    </div>
  );
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

  return (
    <MarqueeViewer
      selection={selection}
      episodeSelection={episodeSelection}
      onEpisodeChange={onEpisodeChange}
      onClear={onClear}
      show={show}
      loading={loading}
    />
  );
}
