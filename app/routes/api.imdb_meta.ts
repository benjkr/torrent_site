import type { LoaderFunctionArgs } from "react-router";
import { normalizeImdbId } from "../lib/imdb";
import { fetchImdbMeta } from "../lib/download-folder";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const id = normalizeImdbId(url.searchParams.get("id"));
  if (!id) {
    return new Response(JSON.stringify({ error: "missing or invalid id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return fetchImdbMeta(id);
}
