import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

import { isVideoFilePath } from "@/lib/media-file";

const VIDEO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
};

/**
 * Filesystem root for torrent data on *this* process.
 * - DEV (default): local `.dev/qbittorrent/downloads` (host side of compose mount)
 * - PROD (default): `/downloads` — same path qB uses inside Docker (bind-mounted)
 */
export function getLibraryFilesRoot(): string {
  const fromEnv = process.env.LIBRARY_FILES_ROOT?.trim();
  if (fromEnv) return resolve(fromEnv);
  if (process.env.NODE_ENV === "production") return "/downloads";
  return resolve(process.cwd(), ".dev/qbittorrent/downloads");
}

/**
 * Absolute path prefix as reported by qBittorrent (container path).
 * Mapped onto {@link getLibraryFilesRoot}. In prod both are usually `/downloads`.
 */
export function getLibraryFilesQbPrefix(): string {
  const raw = process.env.LIBRARY_FILES_QB_PREFIX?.trim() || "/downloads";
  return raw.replace(/\/+$/, "") || "/downloads";
}

export function mimeForLibraryPath(path: string): string {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "application/octet-stream";
  const ext = base.slice(dot + 1).toLowerCase();
  return VIDEO_MIME[ext] ?? "application/octet-stream";
}

/**
 * Map a qB absolute path (`/downloads/...`) onto the host library root.
 * Returns null when the path is outside the configured prefix.
 */
export function mapQbAbsPathToHost(qbAbsPath: string): string | null {
  const root = getLibraryFilesRoot();
  const prefix = getLibraryFilesQbPrefix();
  const normalized = qbAbsPath.replace(/\\/g, "/");

  if (normalized === prefix) return root;
  if (normalized.startsWith(`${prefix}/`)) {
    const rel = normalized.slice(prefix.length + 1);
    return resolveUnderRoot(root, rel);
  }

  // Already a host path under the library root
  const abs = resolve(normalized);
  if (abs === root || abs.startsWith(root + sep)) return abs;
  return null;
}

/** Resolve `relPath` under the library root; null if traversal / missing. */
export function resolveUnderRoot(
  root: string,
  relPath: string,
): string | null {
  const cleaned = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("\0")) return null;
  const abs = resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  return abs;
}

export function resolveLibraryRelPath(relPath: string): string | null {
  return resolveUnderRoot(getLibraryFilesRoot(), relPath);
}

export type LibraryBrowseEntry = {
  name: string;
  path: string;
  type: "dir" | "file";
  size: number;
  videoCount: number;
};

function walkFiles(dirAbs: string, root: string, out: { path: string; size: number }[]) {
  let entries: string[];
  try {
    entries = readdirSync(dirAbs);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "incomplete" || name.startsWith(".")) continue;
    const abs = join(dirAbs, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkFiles(abs, root, out);
    } else if (st.isFile()) {
      out.push({
        path: relative(root, abs).split(sep).join("/"),
        size: st.size,
      });
    }
  }
}

/** Top-level library entries (skip `incomplete`). */
export function browseLibraryRoot(): {
  root: string;
  entries: LibraryBrowseEntry[];
} {
  const root = getLibraryFilesRoot();
  const entries: LibraryBrowseEntry[] = [];

  if (!existsSync(root)) {
    return { root, entries };
  }

  for (const name of readdirSync(root)) {
    if (name === "incomplete" || name.startsWith(".")) continue;
    const abs = join(root, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    const rel = name;
    if (st.isDirectory()) {
      const files: { path: string; size: number }[] = [];
      walkFiles(abs, root, files);
      entries.push({
        name,
        path: rel,
        type: "dir",
        size: files.reduce((s, f) => s + f.size, 0),
        videoCount: files.filter((f) => isVideoFilePath(f.path)).length,
      });
    } else if (st.isFile()) {
      entries.push({
        name,
        path: rel,
        type: "file",
        size: st.size,
        videoCount: isVideoFilePath(name) ? 1 : 0,
      });
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { root, entries };
}

/** Flat file list for a library entry path (dir or single file). */
export function listLibraryEntryFiles(entryRel: string): {
  path: string;
  size: number;
  progress: number;
}[] {
  const root = getLibraryFilesRoot();
  const abs = resolveLibraryRelPath(entryRel);
  if (!abs || !existsSync(abs)) return [];

  const st = statSync(abs);
  if (st.isFile()) {
    return [{ path: entryRel.replace(/\\/g, "/"), size: st.size, progress: 1 }];
  }

  const files: { path: string; size: number }[] = [];
  walkFiles(abs, root, files);
  return files
    .map((f) => ({ path: f.path, size: f.size, progress: 1 }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header || !header.startsWith("bytes=")) return null;
  const [startRaw, endRaw] = header.slice(6).split("-", 2);
  let start = startRaw ? Number(startRaw) : NaN;
  let end = endRaw ? Number(endRaw) : NaN;
  if (Number.isNaN(start)) {
    if (Number.isNaN(end)) return null;
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start < 0 || end < start || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

async function serveLibraryAbsFileDirect(
  absPath: string,
  opts: {
    request: Request;
    disposition: "inline" | "attachment";
    downloadName?: string;
  },
): Promise<Response> {
  const bunFile = Bun.file(absPath);
  const size = bunFile.size;
  const contentType =
    opts.disposition === "inline"
      ? mimeForLibraryPath(absPath)
      : "application/octet-stream";
  const filename = opts.downloadName ?? basename(absPath);

  if (opts.disposition === "attachment") {
    return new Response(bunFile, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  const range = parseRange(opts.request.headers.get("Range"), size);
  if (range) {
    const { start, end } = range;
    return new Response(bunFile.slice(start, end + 1), {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(bunFile, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

export async function serveLibraryAbsFile(
  absPath: string,
  opts: {
    request: Request;
    disposition: "inline" | "attachment";
    downloadName?: string;
  },
): Promise<Response> {
  if (!existsSync(absPath) || !statSync(absPath).isFile()) {
    return new Response(JSON.stringify({ error: "file not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return serveLibraryAbsFileDirect(absPath, opts);
}
