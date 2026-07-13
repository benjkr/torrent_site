import type { ActionFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await qb.reannounceTorrent(hash);
  return { status: "ok" };
}
