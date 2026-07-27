import { useEffect, useState } from "react";

import type { ImdbMeta } from "./types";

const metaCache = new Map<string, ImdbMeta | null>();
const metaInflight = new Map<string, Promise<ImdbMeta | null>>();

export async function fetchImdbMeta(id: string): Promise<ImdbMeta | null> {
  if (metaCache.has(id)) return metaCache.get(id) ?? null;
  const existing = metaInflight.get(id);
  if (existing) return existing;

  const promise = fetch(`/api/imdb_meta?id=${encodeURIComponent(id)}`)
    .then(async (res) => {
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || json.error) return null;
      return json as ImdbMeta;
    })
    .catch(() => null)
    .then((meta) => {
      metaCache.set(id, meta);
      metaInflight.delete(id);
      return meta;
    });

  metaInflight.set(id, promise);
  return promise;
}

/** Shared IMDb meta map (cached across Library + disk usage). */
export function useImdbMetaMap(ids: string[]) {
  const [map, setMap] = useState<Record<string, ImdbMeta | null>>(() => {
    const initial: Record<string, ImdbMeta | null> = {};
    for (const id of ids) {
      if (metaCache.has(id)) initial[id] = metaCache.get(id) ?? null;
    }
    return initial;
  });
  const idsKey = ids.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const missing = ids.filter((id) => !metaCache.has(id));

    setMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of ids) {
        if (metaCache.has(id) && next[id] !== metaCache.get(id)) {
          next[id] = metaCache.get(id) ?? null;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (id) => {
        const meta = await fetchImdbMeta(id);
        return [id, meta] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setMap((prev) => {
        const next = { ...prev };
        for (const [id, meta] of entries) next[id] = meta;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}
