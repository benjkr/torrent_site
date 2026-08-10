import type { LoaderFunctionArgs } from "react-router";

import { serveLibraryAbsFile } from "@/lib/library-files.server";
import { qb } from "@/lib/qb-client";
import {
  downloadFileName,
  resolveTorrentFileAbsPath,
} from "@/lib/torrent-file-path.server";

function isFileComplete(progress: unknown): boolean {
  return Number(progress) >= 1;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  const fileRel = url.searchParams.get("file");

  if (!hash || !fileRel) {
    return new Response(JSON.stringify({ error: "missing hash or file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const files = await qb.torrentFiles(hash);
  const entry = files.find((f: { name?: string }) => f.name === fileRel);
  if (!entry) {
    return new Response(JSON.stringify({ error: "file not found in torrent" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isFileComplete((entry as { progress?: unknown }).progress)) {
    return new Response(
      JSON.stringify({ error: "file not complete" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const resolved = await resolveTorrentFileAbsPath(hash, fileRel);
  if (!resolved.ok) {
    return new Response(JSON.stringify(resolved.body), {
      status: resolved.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return serveLibraryAbsFile(resolved.absPath, {
    request,
    disposition: "attachment",
    downloadName: downloadFileName(fileRel),
  });
}
