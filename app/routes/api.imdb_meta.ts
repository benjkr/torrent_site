import type { LoaderFunctionArgs } from "react-router";
import { imdbThumbnail, normalizeImdbId } from "../lib/imdb";
import type { ImdbMeta } from "../lib/types";

const IMDB_BASE = "https://v3.sg.media-imdb.com/suggestion";
const cache = new Map<string, ImdbMeta | null>();

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const id = normalizeImdbId(url.searchParams.get("id"));
  if (!id) {
    return new Response(JSON.stringify({ error: "missing or invalid id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (cache.has(id)) {
    return cache.get(id);
  }

  const firstLetter = id.charAt(0).toLowerCase();
  const imdbUrl = `${IMDB_BASE}/${firstLetter}/${encodeURIComponent(id)}.json`;

  try {
    const text = await fetch(imdbUrl).then((r) => r.text());
    const stripped = text.replace(/^imdb\$[^(]+\(/, "").replace(/\)$/, "");
    const json = JSON.parse(stripped);
    const match = (json.d || []).find(
      (item: { id?: string }) =>
        typeof item.id === "string" && item.id.toLowerCase() === id,
    );

    const meta: ImdbMeta | null = match
      ? {
          id,
          title: match.l || id,
          year: typeof match.y === "number" ? match.y : null,
          image: match.i?.imageUrl ? imdbThumbnail(match.i.imageUrl, 280) : null,
        }
      : null;

    cache.set(id, meta);
    return meta;
  } catch {
    cache.set(id, null);
    return null;
  }
}
