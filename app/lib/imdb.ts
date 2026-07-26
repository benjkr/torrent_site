const IMDB_ID_RE = /^tt\d+$/i;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** e.g. S01E01 */
export function episodeCode(season: number, episode: number): string {
  return `S${pad2(season)}E${pad2(episode)}`;
}

/** e.g. S01 */
export function seasonCode(season: number): string {
  return `S${pad2(season)}`;
}

/**
 * Whether a torrent name matches an episode (`S01E01`) or season (`S01`) code.
 * Accepts flexible separators and unpadded numbers (`S1E1`, `1x01`, `Season 1`).
 */
export function matchesEpisodeCode(name: string, ep: string): boolean {
  const code = ep.trim().toUpperCase();
  if (!code) return false;

  const episodeMatch = code.match(/^S(\d{1,2})E(\d{1,2})$/i);
  if (episodeMatch) {
    const season = Number(episodeMatch[1]);
    const episode = Number(episodeMatch[2]);
    if (!Number.isFinite(season) || !Number.isFinite(episode)) return false;
    const s = String(season);
    const sPad = pad2(season);
    const e = String(episode);
    const ePad = pad2(episode);
    const sep = "[.\\-_\\s]*";
    const re = new RegExp(
      `(?:S${sep}(?:${sPad}|${s})${sep}E${sep}(?:${ePad}|${e})|(?:${sPad}|${s})${sep}[xX]${sep}(?:${ePad}|${e}))\\b`,
      "i",
    );
    return re.test(name);
  }

  const seasonMatch = code.match(/^S(\d{1,2})$/i);
  if (seasonMatch) {
    const season = Number(seasonMatch[1]);
    if (!Number.isFinite(season)) return false;
    const s = String(season);
    const sPad = pad2(season);
    const sep = "[.\\-_\\s]*";
    const re = new RegExp(
      `(?:S${sep}(?:${sPad}|${s})(?:${sep}E|\\b)|(?:${sPad}|${s})${sep}[xX]|Season${sep}(?:${sPad}|${s})\\b)`,
      "i",
    );
    return re.test(name);
  }

  return false;
}

export function normalizeImdbId(value: string | null | undefined): string | null {
  if (!value) return null;
  const id = value.trim();
  return IMDB_ID_RE.test(id) ? id.toLowerCase() : null;
}

/** Parse qB tags (comma-separated) and return first IMDB id. */
export function imdbIdFromTags(tags: string | string[] | null | undefined): string | null {
  if (!tags) return null;
  const parts = Array.isArray(tags)
    ? tags
    : tags.split(",").map((t) => t.trim());
  for (const part of parts) {
    const id = normalizeImdbId(part);
    if (id) return id;
  }
  return null;
}

export function imdbThumbnail(url: string, width = 280): string {
  return url
    .replace(/\._V1_.*?\.(jpg|png)$/i, ".$1")
    .replace(
      /\.(jpg|png)$/i,
      `._V1_UX${width}_CR0,0,${width},${Math.round(width * 1.48)}_AL_.$1`,
    );
}
