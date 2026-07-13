import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import type { TorrentInfo } from "../lib/types";

export async function loader(): Promise<TorrentInfo[]> {
  const torrents = await qb.listTorrents();
  return torrents.map((t) => ({
    hash: t.hash,
    name: t.name,
    progress: t.progress,
    state: t.state,
    dlspeed: t.dlspeed,
    upspeed: t.upspeed,
    num_seeds: t.num_seeds,
    num_leechs: (t as any).num_leechs,
    num_leechers: (t as any).num_leechers,
    eta: t.eta,
  }));
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
