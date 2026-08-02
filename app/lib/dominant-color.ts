import { useEffect, useState } from "react";

/** Bump when the extraction algorithm changes so stale averages aren't reused. */
const CACHE_VERSION = "dom-v2";

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(url: string): string {
  return `${CACHE_VERSION}:${url}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Skip near-black / near-white / low-chroma pixels so posters don't resolve to gray. */
function isUsefulPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 28) return false;
  if (min > 230) return false;
  if (max - min < 18) return false;
  return true;
}

/**
 * Sample a cover image for its true dominant color (most frequent quantized
 * bucket among useful pixels — not a global average).
 * Returns null on CORS / load failure.
 */
export function extractDominantColor(url: string): Promise<string | null> {
  const key = cacheKey(url);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const finish = (value: string | null) => {
      cache.set(key, value);
      inflight.delete(key);
      resolve(value);
    };

    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // 5-bit RGB buckets → count mode among useful pixels.
        const SHIFT = 3;
        const counts = new Map<
          number,
          { n: number; r: number; g: number; b: number }
        >();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (!isUsefulPixel(r, g, b)) continue;

          const bucketKey =
            ((r >> SHIFT) << 10) | ((g >> SHIFT) << 5) | (b >> SHIFT);
          const bucket = counts.get(bucketKey);
          if (bucket) {
            bucket.n += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
          } else {
            counts.set(bucketKey, { n: 1, r, g, b });
          }
        }

        if (counts.size === 0) {
          finish(null);
          return;
        }

        let best: { n: number; r: number; g: number; b: number } | null =
          null;
        for (const bucket of counts.values()) {
          if (!best || bucket.n > best.n) best = bucket;
        }
        if (!best) {
          finish(null);
          return;
        }

        // Representative = mean of the winning (most frequent) bucket only.
        finish(
          rgbToHex(
            Math.round(best.r / best.n),
            Math.round(best.g / best.n),
            Math.round(best.b / best.n),
          ),
        );
      } catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    // Same-origin proxy avoids canvas CORS taint on IMDb/Amazon media.
    img.src = `/api/image_proxy?url=${encodeURIComponent(url)}`;
  });

  inflight.set(key, promise);
  return promise;
}

/** Soft-wash fill: translucent shade of the dominant cover color (P1). */
export function softWashFill(dominant: string): string {
  return `color-mix(in oklab, ${dominant} 42%, transparent)`;
}

export function parseHexRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const n = parseInt(raw, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Same hue as `hex`, reduced lightness (multiply HSL L).
 * Used for progress sparkles so they match the bar color but read darker.
 */
export function darkenHex(hex: string, lightnessFactor = 0.58): string | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  const nl = Math.max(0, Math.min(1, l * lightnessFactor));
  const hue2rgb = (p: number, q: number, t: number) => {
    let T = t;
    if (T < 0) T += 1;
    if (T > 1) T -= 1;
    if (T < 1 / 6) return p + (q - p) * 6 * T;
    if (T < 1 / 2) return q;
    if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6;
    return p;
  };
  let nr: number;
  let ng: number;
  let nb: number;
  if (s === 0) {
    nr = ng = nb = nl;
  } else {
    const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
    const p = 2 * nl - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  return `rgb(${Math.round(nr * 255)},${Math.round(ng * 255)},${Math.round(nb * 255)})`;
}

export function useDominantColor(imageUrl: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(() =>
    imageUrl && cache.has(cacheKey(imageUrl))
      ? (cache.get(cacheKey(imageUrl)) ?? null)
      : null,
  );

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }
    const key = cacheKey(imageUrl);
    if (cache.has(key)) {
      setColor(cache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    extractDominantColor(imageUrl).then((next) => {
      if (!cancelled) setColor(next);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}

/** Batch dominant colors keyed by image URL (shared cache with useDominantColor). */
export function useDominantColorMap(
  urls: string[],
): Record<string, string | null> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const urlsKey = unique.slice().sort().join("\0");
  const [map, setMap] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const url of unique) {
      const key = cacheKey(url);
      if (cache.has(key)) initial[url] = cache.get(key) ?? null;
    }
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    const missing = unique.filter((url) => !cache.has(cacheKey(url)));

    setMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const url of unique) {
        const key = cacheKey(url);
        if (cache.has(key) && next[url] !== cache.get(key)) {
          next[url] = cache.get(key) ?? null;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (url) => {
        const color = await extractDominantColor(url);
        return [url, color] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setMap((prev) => {
        const next = { ...prev };
        for (const [url, color] of entries) next[url] = color;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [urlsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}
