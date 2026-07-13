import type { LoaderFunctionArgs } from "react-router";
import type { ApiItem } from "../lib/types";

const APYBAY_BASE = "https://apibay.org";

async function getJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  if (!query) return [];

  const torrents = (await getJson(`${APYBAY_BASE}/q.php?q=${encodeURIComponent(query)}`)).slice(
    0,
    50,
  );

  const concurrency = Math.min(8, Math.max(4, torrents.length));
  const enriched = await mapWithConcurrency(
    torrents,
    async (torrent: any) => {
      try {
        const files = await getJson(`${APYBAY_BASE}/f.php?id=${torrent.id}`);
        return { ...torrent, files: Array.isArray(files) ? files : [] };
      } catch {
        return { ...torrent, files: [] };
      }
    },
    concurrency,
  );

  return enriched as ApiItem[];
}
