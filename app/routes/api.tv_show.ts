import type { LoaderFunctionArgs } from "react-router";
import { normalizeImdbId } from "../lib/imdb";
import { fetchImdbTitleShow } from "../lib/imdb-graphql";
import type { TvShowPayload } from "../lib/types";

const cache = new Map<string, TvShowPayload>();

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const imdb = normalizeImdbId(url.searchParams.get("imdb"));
  if (!imdb) {
    return new Response(JSON.stringify({ error: "missing or invalid imdb" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (cache.has(imdb)) return cache.get(imdb)!;

  try {
    const payload = await fetchImdbTitleShow(imdb);
    cache.set(imdb, payload);
    return payload;
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to load IMDb show data",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
