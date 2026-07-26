import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import type { TorrentInfo } from "../lib/types";

export async function loader(): Promise<TorrentInfo[] | Response> {
  try {
    // No filter → all torrents (downloading, seeding, paused, finished)
    const torrents = await qb.listTorrents({ sort: "added_on", reverse: true });
    return torrents.map((t) => ({
      hash: t.hash,
      name: t.name,
      progress: t.progress,
      state: t.state,
      dlspeed: t.dlspeed,
      upspeed: t.upspeed,
      num_seeds: t.num_seeds,
      num_leechs: t.num_leechs,
      num_leechers: t.num_leechs,
      eta: t.eta,
      size: t.size,
      save_path: t.save_path,
      added_on: t.added_on,
      completion_on: t.completion_on,
      category: t.category || "",
      tags: t.tags || "",
      ratio: t.ratio,
    }));
  } catch (e) {
    return new Response(
      JSON.stringify({
        error:
          e instanceof Error
            ? e.message
            : "Failed to list torrents (is qBittorrent running?)",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "DELETE") {
    return handleDelete(request);
  }

  const url = new URL(request.url);
  const formData = await request.formData();
  const _method = formData.get("_method") || url.searchParams.get("_method");

  if (_method === "DELETE") {
    return handleDelete(request);
  }

  return new Response(JSON.stringify({ error: "method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleDelete(request: Request) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const withFiles = ["1", "true", "True"].includes(
    url.searchParams.get("withFiles") || "0",
  );

  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await qb.removeTorrent(hash, withFiles);
  return { status: "ok" };
}
