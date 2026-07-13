import type { LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import type { FileInfo } from "../lib/types";
import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  if (!hash) {
    return new Response(JSON.stringify({ error: "missing hash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const files = await qb.torrentFiles(hash);
  const infoList = await qb.listTorrents({ hashes: hash });
  let rootPath: string | null = null;

  if (infoList.length > 0) {
    const info: any = infoList[0];
    const contentPath = info.content_path;
    const savePath = info.save_path;

    if (contentPath) {
      if (existsSync(contentPath) && statSync(contentPath).isDirectory()) {
        rootPath = contentPath;
      } else {
        rootPath = dirname(contentPath);
      }
    } else if (savePath) {
      rootPath = savePath;
    }
  }

  const result: FileInfo[] = files.map((f: any) => ({
    name: f.name,
    size: f.size,
    progress: f.progress,
    priority: f.priority,
    is_seed: f.is_seed ?? false,
    availability: f.availability ?? null,
  }));

  return { hash, root_path: rootPath, files: result };
}
