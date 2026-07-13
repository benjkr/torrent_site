import type { LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const name = url.searchParams.get("name");

  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name || hash)}`;
  await qb.addMagnet(magnet);
  return { status: "ok" };
}
