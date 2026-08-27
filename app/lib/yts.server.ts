import type { ApiItem } from "./types";

const YTS_LIST = "https://movies-api.accel.li/api/v2/list_movies.json";
const YTS_UA = "torrent-site/1.0";
export const YTS_LIMIT = 20;

type YtsTorrent = {
  hash?: string;
  quality?: string;
  type?: string;
  video_codec?: string;
  seeds?: number;
  peers?: number;
  size_bytes?: number;
  date_uploaded_unix?: number;
};

type YtsMovie = {
  id?: number | string;
  imdb_code?: string;
  title?: string;
  title_english?: string;
  title_long?: string;
  year?: number;
  torrents?: YtsTorrent[];
};

export type YtsFetchResult = {
  url: string;
  raw: unknown[];
  valid: ApiItem[];
};

export function ytsListUrl(queryTerm: string, limit = YTS_LIMIT): string {
  const params = new URLSearchParams({
    query_term: queryTerm,
    limit: String(limit),
  });
  return `${YTS_LIST}?${params}`;
}

export function isYtsSearchId(id: string): boolean {
  return id.startsWith("yts-");
}

/** Map YTS `type` onto tokens the existing name filters / prop parser recognize. */
export function formatYtsType(type: string | undefined): string {
  const t = (type || "").trim().toLowerCase();
  if (!t) return "";
  if (t === "bluray" || t === "blu-ray") return "BluRay";
  if (t === "web" || t === "webdl" || t === "web-dl") return "WEB-DL";
  if (t === "webrip") return "WEBRip";
  if (t === "hdrip") return "HDRip";
  if (t === "bdrip") return "BDRip";
  return type!.trim();
}

function movieTitle(movie: YtsMovie): string {
  for (const value of [movie.title_english, movie.title, movie.title_long]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Unknown";
}

export function ytsTorrentName(movie: YtsMovie, torrent: YtsTorrent): string {
  const title = movieTitle(movie);
  const headed =
    movie.year != null && Number.isFinite(movie.year)
      ? `${title} (${movie.year})`
      : title;
  const parts = [headed];
  if (torrent.quality) parts.push(String(torrent.quality));
  const type = formatYtsType(torrent.type);
  if (type) parts.push(type);
  if (torrent.video_codec) parts.push(String(torrent.video_codec));
  return parts.join(" ");
}

export function mapYtsMoviesToItems(movies: unknown[]): ApiItem[] {
  const items: ApiItem[] = [];
  for (const raw of movies) {
    if (!raw || typeof raw !== "object") continue;
    const movie = raw as YtsMovie;
    const torrents = Array.isArray(movie.torrents) ? movie.torrents : [];
    for (const torrent of torrents) {
      const hash = (torrent.hash || "").trim();
      if (!hash) continue;
      const movieId = movie.id ?? "x";
      items.push({
        added: String(torrent.date_uploaded_unix ?? 0),
        files: [],
        category: "movie",
        id: `yts-${movieId}-${hash}`,
        leechers: String(torrent.peers ?? 0),
        imdb: movie.imdb_code ?? "",
        info_hash: hash,
        name: ytsTorrentName(movie, torrent),
        num_files: "1",
        seeders: String(torrent.seeds ?? 0),
        size: String(torrent.size_bytes ?? 0),
        status: "trusted",
        username: "YTS",
        tracker: "yts",
      });
    }
  }
  return items;
}

function moviesFromPayload(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  const root = parsed as {
    status?: string;
    status_message?: string;
    data?: { movies?: unknown };
  };
  if (root.status != null && root.status !== "ok") {
    throw new Error(root.status_message || `YTS status ${root.status}`);
  }
  const movies = root.data?.movies;
  return Array.isArray(movies) ? movies : [];
}

export async function fetchYts(queryTerm: string): Promise<YtsFetchResult> {
  const url = ytsListUrl(queryTerm);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": YTS_UA,
    },
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("YTS returned non-JSON");
  }
  if (!res.ok) {
    throw new Error(`YTS HTTP ${res.status}`);
  }
  const movies = moviesFromPayload(parsed);
  return {
    url,
    raw: movies,
    valid: mapYtsMoviesToItems(movies),
  };
}
