/** Parsed release tags from a torrent name (quality / source / codec). */
export type TorrentProps = {
  resolution: string | null;
  source: string | null;
  codec: string | null;
};

/** Extract resolution, source, and codec from a torrent display name. */
export function parseTorrentProps(name: string): TorrentProps {
  const n = name;
  const resolution =
    n.match(/\b(2160p|1080p|720p|480p)\b/i)?.[1]?.toLowerCase() ??
    (/\b4k\b/i.test(n) ? "2160p" : null);
  let source =
    n.match(/\b(BluRay|Blu-Ray|BDRip|WEB-?DL|WEBRip|REMUX|HDTV|DVDRip)\b/i)?.[1] ??
    null;
  if (source) {
    if (/blu-?ray/i.test(source)) source = "BluRay";
    else if (/web-?dl/i.test(source)) source = "WEB-DL";
    else if (/remux/i.test(source)) source = "REMUX";
    else if (/webrip/i.test(source)) source = "WEBRip";
  }
  let codec = n.match(/\b(x264|x265|H\.?265|HEVC|AV1)\b/i)?.[1] ?? null;
  if (codec) {
    if (/h\.?265|hevc/i.test(codec)) codec = "HEVC";
    else codec = codec.toLowerCase();
  }
  return { resolution, source, codec };
}
