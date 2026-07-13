import type { LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";

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

  const infoList = await qb.listTorrents({ hashes: hash });
  if (infoList.length === 0) {
    return new Response(JSON.stringify({ error: "torrent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const info: any = infoList[0];

  function candidateRoots(): string[] {
    const candidates: string[] = [];
    const contentPath = info.content_path as string | undefined;
    const savePath = info.save_path as string | undefined;
    const name = info.name as string | undefined;

    if (contentPath) {
      if (existsSync(contentPath) && statSync(contentPath).isDirectory()) {
        candidates.push(contentPath);
      } else {
        candidates.push(dirname(contentPath));
      }
    }
    if (savePath) {
      candidates.push(savePath);
      if (name) {
        candidates.push(join(savePath, name));
      }
    }

    const seen = new Set<string>();
    return candidates.filter((c) => {
      if (!c || seen.has(c)) return false;
      seen.add(c);
      return true;
    });
  }

  const roots = candidateRoots();

  let chosenAbs: string | null = null;
  for (const root of roots) {
    const absPath = resolve(root, fileRel);
    if (!absPath.startsWith(resolve(root))) continue;
    if (existsSync(absPath)) {
      chosenAbs = absPath;
      break;
    }
  }

  if (!chosenAbs) {
    const savePath = info.save_path as string | undefined;
    const name = info.name as string | undefined;
    if (savePath && name) {
      const fallbackRoot = join(savePath, name);
      const absPath = resolve(fallbackRoot, fileRel);
      if (absPath.startsWith(resolve(fallbackRoot)) && existsSync(absPath)) {
        chosenAbs = absPath;
      }
    }
  }

  if (!chosenAbs) {
    return new Response(
      JSON.stringify({
        error: "root path not available",
        tried_roots: roots,
        file: fileRel,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const file = Bun.file(chosenAbs);
  return new Response(file, {
    headers: {
      "Content-Disposition": `attachment; filename="${basename(fileRel)}"`,
      "Content-Type": "application/octet-stream",
    },
  });
}
