import { qb } from "../lib/qb-client";

export async function loader(): Promise<Response> {
  try {
    const version = await qb.getAppVersion();
    return Response.json({ ok: true, version });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "qBittorrent is unreachable",
      },
      { status: 502 },
    );
  }
}
