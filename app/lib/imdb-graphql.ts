import { imdbThumbnail } from "./imdb";
import type { TvSeason, TvShowPayload } from "./types";

const GQL = "https://api.graphql.imdb.com/";

const HEADERS = {
  "content-type": "application/json",
  "x-imdb-client-name": "imdb-web-next",
};

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`IMDb GraphQL HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: { message?: string }[];
  };
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "IMDb GraphQL error");
  }
  if (!json.data) throw new Error("IMDb GraphQL empty response");
  return json.data;
}

type EpNode = {
  id?: string;
  titleText?: { text?: string } | null;
  ratingsSummary?: { aggregateRating?: number | null } | null;
  series?: {
    episodeNumber?: {
      episodeNumber?: number | null;
      seasonNumber?: number | null;
    } | null;
  } | null;
};

type EpPageInfo = { endCursor?: string | null; hasNextPage?: boolean };
type EpEdge = { node?: EpNode | null };
type EpConnection = { pageInfo?: EpPageInfo; edges?: EpEdge[] | null };
type TitleEpisodes = { title?: { episodes?: { episodes?: EpConnection | null } | null } | null };

/** Page size for episode connection; larger = fewer sequential round-trips. */
const EPISODE_PAGE_SIZE = 250;

type TitleShowResult = {
  title?: {
    id?: string;
    titleText?: { text?: string } | null;
    titleType?: { id?: string; text?: string } | null;
    releaseYear?: { year?: number } | null;
    ratingsSummary?: { aggregateRating?: number | null } | null;
    genres?: { genres?: { text?: string }[] } | null;
    primaryImage?: { url?: string } | null;
    episodes?: { episodes?: EpConnection | null } | null;
  } | null;
};

const TITLE_SHOW = `
query TitleShow($id: ID!, $after: ID) {
  title(id: $id) {
    id
    titleText { text }
    titleType { id text }
    releaseYear { year }
    ratingsSummary { aggregateRating }
    genres { genres { text } }
    primaryImage { url }
    episodes {
      episodes(first: ${EPISODE_PAGE_SIZE}, after: $after) {
        pageInfo { endCursor hasNextPage }
        edges {
          node {
            id
            titleText { text }
            ratingsSummary { aggregateRating }
            series {
              episodeNumber { episodeNumber seasonNumber }
            }
          }
        }
      }
    }
  }
}
`;

const EPISODES_PAGE = `
query TitleEpisodes($id: ID!, $after: ID) {
  title(id: $id) {
    episodes {
      episodes(first: ${EPISODE_PAGE_SIZE}, after: $after) {
        pageInfo { endCursor hasNextPage }
        edges {
          node {
            id
            titleText { text }
            ratingsSummary { aggregateRating }
            series {
              episodeNumber { episodeNumber seasonNumber }
            }
          }
        }
      }
    }
  }
}
`;

function ingestEpisodePage(
  bySeason: Map<number, TvSeason>,
  conn: EpConnection | null | undefined,
): { hasNextPage: boolean; after: string | null } {
  if (!conn) return { hasNextPage: false, after: null };

  for (const edge of conn.edges || []) {
    const node = edge?.node;
    if (!node) continue;
    const season = node.series?.episodeNumber?.seasonNumber;
    const number = node.series?.episodeNumber?.episodeNumber;
    if (season == null || number == null) continue;

    let seasonBucket = bySeason.get(season);
    if (!seasonBucket) {
      seasonBucket = { season, episodes: [] };
      bySeason.set(season, seasonBucket);
    }
    seasonBucket.episodes.push({
      number,
      name: node.titleText?.text || `Episode ${number}`,
      rating:
        typeof node.ratingsSummary?.aggregateRating === "number"
          ? node.ratingsSummary.aggregateRating
          : null,
    });
  }

  const hasNextPage = Boolean(conn.pageInfo?.hasNextPage);
  const after = conn.pageInfo?.endCursor ?? null;
  return { hasNextPage: hasNextPage && Boolean(after), after };
}

function finalizeSeasons(bySeason: Map<number, TvSeason>): TvSeason[] {
  return Array.from(bySeason.values())
    .map((s) => ({
      ...s,
      episodes: s.episodes
        .sort((a, b) => a.number - b.number)
        // de-dupe by episode number if any
        .filter(
          (ep, i, arr) => arr.findIndex((x) => x.number === ep.number) === i,
        ),
    }))
    .sort((a, b) => a.season - b.season);
}

export async function fetchImdbTitleShow(imdb: string): Promise<TvShowPayload> {
  // Meta + first episode page in one request (was: meta, then 50-at-a-time pages).
  const first = await gql<TitleShowResult>(TITLE_SHOW, { id: imdb, after: null });

  const t = first.title;
  if (!t) {
    return {
      kind: "unknown",
      imdb,
      title: imdb,
      year: null,
      image: null,
      stars: "",
      rating: null,
      genres: [],
      status: null,
      seasons: [],
    };
  }

  const typeId = (t.titleType?.id || "").toLowerCase();
  const isSeries =
    typeId.includes("series") || typeId.includes("miniseries");

  const title = t.titleText?.text || imdb;
  const year = typeof t.releaseYear?.year === "number" ? t.releaseYear.year : null;
  const rating =
    typeof t.ratingsSummary?.aggregateRating === "number"
      ? t.ratingsSummary.aggregateRating
      : null;
  const genres = (t.genres?.genres || [])
    .map((g) => g.text)
    .filter((x): x is string => Boolean(x));
  const image = t.primaryImage?.url
    ? imdbThumbnail(t.primaryImage.url, 280)
    : null;

  if (!isSeries) {
    return {
      kind: "movie",
      imdb,
      title,
      year,
      image,
      stars: "",
      rating,
      genres,
      status: null,
      seasons: [],
    };
  }

  const bySeason = new Map<number, TvSeason>();
  let page = ingestEpisodePage(bySeason, t.episodes?.episodes);

  // Remaining pages only when the show has more than EPISODE_PAGE_SIZE episodes.
  for (let n = 0; n < 20 && page.hasNextPage && page.after; n++) {
    const data: TitleEpisodes = await gql<TitleEpisodes>(EPISODES_PAGE, {
      id: imdb,
      after: page.after,
    });
    page = ingestEpisodePage(bySeason, data.title?.episodes?.episodes);
  }

  return {
    kind: "series",
    imdb,
    title,
    year,
    image,
    stars: "",
    rating,
    genres,
    status: null,
    seasons: finalizeSeasons(bySeason),
  };
}
