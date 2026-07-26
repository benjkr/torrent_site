import type { LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";

/** Piece states from qBittorrent: 0 = not downloaded, 1 = downloading, 2 = complete */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const pieces = await qb.torrentPieceStates(hash);
    // Ensure plain number array for JSON
    const states = Array.from(pieces as Iterable<number>, (p) => Number(p));
    const complete = states.filter((s) => s === 2).length;
    const downloading = states.filter((s) => s === 1).length;
    return {
      hash,
      pieces: states,
      total: states.length,
      complete,
      downloading,
      missing: states.length - complete - downloading,
    };
  } catch (e) {
    return new Response(
      JSON.stringify({
        error:
          e instanceof Error ? e.message : "Failed to load piece states",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
