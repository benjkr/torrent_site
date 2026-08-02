import type { LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import { IMDB_ASSUMED_TAG, normalizeImdbId } from "../lib/imdb";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const name = url.searchParams.get("name");
  const imdb = normalizeImdbId(url.searchParams.get("imdb"));
  const imdbAssumed =
    url.searchParams.get("imdbAssumed") === "1" ||
    url.searchParams.get("imdbAssumed") === "true";

  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name || hash)}`;
  const tags = imdb
    ? imdbAssumed
      ? `${imdb},${IMDB_ASSUMED_TAG}`
      : imdb
    : undefined;
  try {
    await qb.addMagnet(magnet, tags ? { tags } : undefined);
    return { status: "ok" };
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to add torrent",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
