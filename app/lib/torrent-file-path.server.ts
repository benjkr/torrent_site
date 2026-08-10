import { existsSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import {
  getLibraryFilesRoot,
  mapQbAbsPathToHost,
  resolveLibraryRelPath,
} from "@/lib/library-files.server";
import { qb } from "@/lib/qb-client";

export type ResolvedTorrentFile =
  | { ok: true; absPath: string; info: Record<string, unknown> }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
    };

function candidateRoots(info: Record<string, unknown>): string[] {
  const candidates: string[] = [];
  const contentPath = info.content_path as string | undefined;
  const savePath = info.save_path as string | undefined;
  const name = info.name as string | undefined;

  if (contentPath) {
    if (existsSync(contentPath) && statSync(contentPath).isDirectory()) {
      candidates.push(contentPath);
    } else if (existsSync(contentPath)) {
      candidates.push(dirname(contentPath));
    }
    const mapped = mapQbAbsPathToHost(contentPath);
    if (mapped) {
      if (existsSync(mapped) && statSync(mapped).isDirectory()) {
        candidates.push(mapped);
      } else {
        candidates.push(dirname(mapped));
      }
    }
  }

  if (savePath) {
    candidates.push(savePath);
    const mappedSave = mapQbAbsPathToHost(savePath);
    if (mappedSave) candidates.push(mappedSave);
    if (name) {
      candidates.push(join(savePath, name));
      if (mappedSave) candidates.push(join(mappedSave, name));
    }
  }

  // Always try the configured host download folder (default torrent dir).
  candidates.push(getLibraryFilesRoot());

  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (!c || seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

export function isTorrentCompleted(info: Record<string, unknown>): boolean {
  const progress = Number(info.progress ?? 0);
  const state = String(info.state ?? "").toLowerCase();
  return progress >= 1 || state.includes("up");
}

export async function resolveTorrentFileAbsPath(
  hash: string,
  fileRel: string,
): Promise<ResolvedTorrentFile> {
  const infoList = await qb.listTorrents({ hashes: hash });
  if (infoList.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: "torrent not found" },
    };
  }

  const info = infoList[0] as unknown as Record<string, unknown>;
  const roots = candidateRoots(info);
  const tried: string[] = [];

  for (const root of roots) {
    const absPath = resolve(root, fileRel);
    tried.push(absPath);
    if (!absPath.startsWith(resolve(root))) continue;
    if (existsSync(absPath) && statSync(absPath).isFile()) {
      return { ok: true, absPath, info };
    }
  }

  // Direct relative path under the library root (fileRel as stored by qB).
  const underLibrary = resolveLibraryRelPath(fileRel);
  if (underLibrary) {
    tried.push(underLibrary);
    if (existsSync(underLibrary) && statSync(underLibrary).isFile()) {
      return { ok: true, absPath: underLibrary, info };
    }
  }

  return {
    ok: false,
    status: 500,
    body: {
      error: "root path not available",
      tried_roots: roots,
      tried_paths: tried,
      file: fileRel,
      library_root: getLibraryFilesRoot(),
    },
  };
}

export function downloadFileName(fileRel: string) {
  return basename(fileRel);
}
