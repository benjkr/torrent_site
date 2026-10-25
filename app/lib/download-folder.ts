import { qb } from "./qb-client";
import { imdbThumbnail } from "./imdb";
import type { ImdbMeta } from "./types";

const IMDB_SUGGEST = "https://v3.sg.media-imdb.com/suggestion";
const metaCache = new Map<string, ImdbMeta | null>();

/** Title/year/poster for an IMDb id via the public suggestion endpoint (cached). */
export async function fetchImdbMeta(id: string): Promise<ImdbMeta | null> {
  if (metaCache.has(id)) return metaCache.get(id)!;

  const url = `${IMDB_SUGGEST}/${id.charAt(0).toLowerCase()}/${encodeURIComponent(id)}.json`;
  try {
    const text = await fetch(url).then((r) => r.text());
    const stripped = text.replace(/^imdb\$[^(]+\(/, "").replace(/\)$/, "");
    const json = JSON.parse(stripped);
    const match = (json.d || []).find(
      (item: { id?: string }) =>
        typeof item.id === "string" && item.id.toLowerCase() === id,
    );
    const meta: ImdbMeta | null = match
      ? {
          id,
          title: match.l || id,
          year: typeof match.y === "number" ? match.y : null,
          image: match.i?.imageUrl ? imdbThumbnail(match.i.imageUrl, 280) : null,
        }
      : null;
    metaCache.set(id, meta);
    return meta;
  } catch {
    // Don't cache network failures; a later download can retry.
    return null;
  }
}

/** Make a title safe as a single folder name on Windows/Linux/macOS. */
export function sanitizeFolderName(name: string): string {
  return name
    .replace(/\s*:\s*/g, " - ")
    .replace(/[<>"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
}

/**
 * Best-effort clean title from a release name, e.g.
 * `Show.Name.S01E02.1080p.WEB` → `Show Name`, `Movie.Name.2021.1080p` → `Movie Name (2021)`.
 */
export function titleFromReleaseName(name: string): { title: string; year: number | null } {
  const spaced = name.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  const cut = spaced.search(
    /\b(?:S\d{1,2}(?:\s*E\d{1,3})?|\d{1,2}x\d{2}|Season\s*\d+|Complete|\d{3,4}p|BluRay|BRRip|WEB(?:-?DL|Rip)?|HDRip|DVDRip|HDTV|x26[45]|H\s?26[45]|HEVC)\b|[[(]/i,
  );
  let head = (cut > 0 ? spaced.slice(0, cut) : spaced).trim();

  let year: number | null = null;
  const yearMatch = head.match(/^(.*?)\s*\b((?:19|20)\d{2})\b\s*$/);
  if (yearMatch && yearMatch[1]) {
    head = yearMatch[1];
    year = Number(yearMatch[2]);
  } else {
    const inName = spaced.match(/[[(]((?:19|20)\d{2})[\])]/);
    if (inName) year = Number(inName[1]);
  }

  return { title: head.replace(/[\s\-–]+$/, "").trim(), year };
}

function joinPath(base: string, child: string): string {
  const sep = base.includes("\\") && !base.includes("/") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${sep}${child}`;
}

function baseName(path: string): string {
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
}

/**
 * Folder under qB's default save path for a download: `<Title> (<Year>)`.
 * Prefers the IMDb title; otherwise parses the release name and reuses an
 * existing folder for the same title (so episodes land with their show).
 */
export async function resolveSavePath(opts: {
  name: string;
  imdb: string | null;
}): Promise<string | null> {
  let title: string | null = null;
  let year: number | null = null;

  if (opts.imdb) {
    const meta = await fetchImdbMeta(opts.imdb);
    if (meta && meta.title !== meta.id) {
      title = meta.title;
      year = meta.year;
    }
  }
  if (!title) {
    ({ title, year } = titleFromReleaseName(opts.name));
  }

  const folder = sanitizeFolderName(year ? `${title} (${year})` : title);
  if (!folder) return null;

  const prefs = await qb.getPreferences();
  const base = prefs.save_path;
  if (!base) return null;

  // Without a year (typically an episode release lacking IMDb), reuse an
  // existing folder for the same title, e.g. "Show" → "Show (2019)".
  if (!year) {
    const bare = folder.toLowerCase();
    const torrents = await qb.listTorrents().catch(() => []);
    for (const t of torrents) {
      const existing = baseName(t.save_path);
      const lower = existing.toLowerCase();
      if (lower === bare || lower.startsWith(`${bare} (`)) {
        return joinPath(base, existing);
      }
    }
  }

  return joinPath(base, folder);
}
