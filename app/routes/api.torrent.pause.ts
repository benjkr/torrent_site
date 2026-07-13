import type { ActionFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";

export async function action({ request }: ActionFunctionArgs) {
  const hash = getHash(request);
  if (!hash) return error("missing hash", 400);

  await qb.pauseTorrent(hash);
  return { status: "ok" };
}

function getHash(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("hash");
}

async function error(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
