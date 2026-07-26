import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

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
 * Sample a cover image for a single dominant RGB (averaged useful pixels).
 * Returns null on CORS / load failure.
 */
export function extractDominantColor(url: string): Promise<string | null> {
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const finish = (value: string | null) => {
      cache.set(url, value);
      inflight.delete(url);
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

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (!isUsefulPixel(r, g, b)) continue;
          rSum += r;
          gSum += g;
          bSum += b;
          count += 1;
        }

        if (count === 0) {
          finish(null);
          return;
        }

        finish(
          rgbToHex(
            Math.round(rSum / count),
            Math.round(gSum / count),
            Math.round(bSum / count),
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

  inflight.set(url, promise);
  return promise;
}

/** Soft-wash fill: translucent shade of the dominant cover color (P1). */
export function softWashFill(dominant: string): string {
  return `color-mix(in oklab, ${dominant} 42%, transparent)`;
}

export function useDominantColor(imageUrl: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(() =>
    imageUrl && cache.has(imageUrl) ? (cache.get(imageUrl) ?? null) : null,
  );

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }
    if (cache.has(imageUrl)) {
      setColor(cache.get(imageUrl) ?? null);
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
