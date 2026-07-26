import type { LoaderFunctionArgs } from "react-router";
import { imdbThumbnail } from "../lib/imdb";
import type { ImdbSuggestion, ImdbTitleType } from "../lib/types";

const IMDB_BASE = "https://v3.sg.media-imdb.com/suggestion";

function mapType(qid?: string, q?: string): ImdbTitleType {
  if (qid === "tvSeries" || qid === "tvMiniSeries") return "series";
  if (qid === "movie" || qid === "tvMovie") return "movie";
  if (q === "TV series" || q === "TV mini series" || q === "TV mini-series") {
    return "series";
  }
  if (q === "feature" || q === "TV movie") return "movie";
  return "unknown";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  if (!query || query.length < 1) return [];

  const firstLetter = query.charAt(0).toLowerCase();
  const imdbUrl = `${IMDB_BASE}/${firstLetter}/${encodeURIComponent(query)}.json`;

  try {
    const text = await fetch(imdbUrl).then((r) => r.text());
    // v3 API returns plain JSON; older endpoints used JSONP (imdb$...(...))
    const stripped = text.replace(/^imdb\$[^(]+\(/, "").replace(/\)$/, "");
    const json = JSON.parse(stripped);
    // Prefer stable qid when present; fall back to q (note: "TV mini-series" has a hyphen)
    const allowedQid = new Set(["movie", "tvSeries", "tvMiniSeries", "tvMovie"]);
    const allowedQ = new Set([
      "feature",
      "TV series",
      "TV mini series",
      "TV mini-series",
      "TV movie",
    ]);
    const items: ImdbSuggestion[] = (json.d || [])
      .filter(
        (item: { id?: string; qid?: string; q?: string }) =>
          item.id?.startsWith("tt") &&
          (item.qid ? allowedQid.has(item.qid) : allowedQ.has(item.q || "")),
      )
      .slice(0, 8)
      .map(
        (item: {
          l?: string;
          id: string;
          y?: number;
          i?: { imageUrl?: string };
          s?: string;
          qid?: string;
          q?: string;
        }) => ({
          title: item.l || item.id,
          id: item.id,
          year: typeof item.y === "number" ? item.y : null,
          image: item.i?.imageUrl ? imdbThumbnail(item.i.imageUrl, 140) : null,
          stars: item.s || "",
          type: mapType(item.qid, item.q),
        }),
      );
    return items;
  } catch {
    return [];
  }
}
