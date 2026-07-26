import type { LoaderFunctionArgs } from "react-router";
import { matchesEpisodeCode, normalizeImdbId } from "../lib/imdb";
import type {
  ApiItem,
  SearchDebugInfo,
  SearchDebugQueryBranch,
  SearchResponse,
} from "../lib/types";

const APYBAY_BASE = "https://apibay.org";

function apibayUrlFor(q: string): string {
  return `${APYBAY_BASE}/q.php?q=${encodeURIComponent(q)}`;
}

function isValidRow(t: unknown): t is ApiItem {
  return (
    Boolean(t) &&
    typeof t === "object" &&
    (t as ApiItem).id !== "0" &&
    (t as ApiItem).name !== "No results returned"
  );
}

async function fetchApibay(q: string): Promise<{
  url: string;
  raw: unknown[];
  valid: ApiItem[];
}> {
  const url = apibayUrlFor(q);
  const raw: unknown[] = await fetch(url).then((r) => r.json());
  const list = Array.isArray(raw) ? raw : [];
  return {
    url,
    raw: list,
    valid: list.filter(isValidRow),
  };
}

function applyNameFilters(results: ApiItem[], rawFilters: string[]): ApiItem[] {
  if (rawFilters.length === 0) return results;
  const lowerFilters = rawFilters.map((f) => f.toLowerCase());
  const resolutions = new Set(["720p", "1080p", "2160p"]);
  const resFilters = lowerFilters.filter((f) => resolutions.has(f));
  const otherFilters = lowerFilters.filter((f) => !resolutions.has(f));
  return results.filter((t) => {
    const name = (t.name || "").toLowerCase();
    const resOk =
      resFilters.length === 0 || resFilters.some((f) => name.includes(f));
    const otherOk = otherFilters.every((f) => name.includes(f));
    return resOk && otherOk;
  });
}

function mergeByHash(batches: ApiItem[][]): ApiItem[] {
  const byHash = new Map<string, ApiItem>();
  for (const batch of batches) {
    for (const item of batch) {
      const hash = (item.info_hash || "").toLowerCase();
      if (!hash) continue;
      if (!byHash.has(hash)) byHash.set(hash, item);
    }
  }
  return Array.from(byHash.values());
}

function buildDebug(opts: {
  query: string;
  filters: string[];
  branches: SearchDebugQueryBranch[];
  durationMs: number;
  raw: unknown[];
  filtered: ApiItem[];
  items: ApiItem[];
}): SearchDebugInfo {
  const primary = opts.branches[0];
  return {
    query: opts.query,
    filters: opts.filters,
    apibayUrl: primary?.url ?? "",
    queries: opts.branches,
    fetchedAt: new Date().toISOString(),
    durationMs: opts.durationMs,
    rawCount: opts.raw.length,
    afterFilterCount: opts.filtered.length,
    returnedCount: opts.items.length,
    raw: opts.raw,
    filtered: opts.filtered,
  };
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<SearchResponse> {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const imdb = normalizeImdbId(url.searchParams.get("imdb"));
  const title = url.searchParams.get("title")?.trim() || null;
  const ep = url.searchParams.get("ep")?.trim() || null;
  const rawFilters = url.searchParams.getAll("filters");

  const dualMode = Boolean(imdb && ep);
  if (!dualMode && !query) return [];

  const started = performance.now();
  const displayQuery =
    dualMode && title
      ? `${title} ${ep}`
      : dualMode
        ? `${imdb} ${ep}`
        : (query as string);

  if (dualMode) {
    const nameQuery = title ? `${title} ${ep}` : null;
    const [imdbBranch, nameBranch] = await Promise.all([
      fetchApibay(imdb!),
      nameQuery ? fetchApibay(nameQuery) : Promise.resolve(null),
    ]);

    const imdbMatched = imdbBranch.valid.filter((t) =>
      matchesEpisodeCode(t.name || "", ep!),
    );
    const nameMatched = nameBranch?.valid ?? [];
    let results = mergeByHash([imdbMatched, nameMatched]);
    results = applyNameFilters(results, rawFilters);
    const items = results.slice(0, 20);

    const durationMs = Math.round(performance.now() - started);
    if (!import.meta.env.DEV) return items;

    const branches: SearchDebugQueryBranch[] = [
      {
        label: `IMDb id + regex ${ep}`,
        url: imdbBranch.url,
        rawCount: imdbBranch.raw.length,
        afterFilterCount: imdbMatched.length,
      },
    ];
    if (nameBranch && nameQuery) {
      branches.push({
        label: `Name + ${ep}`,
        url: nameBranch.url,
        rawCount: nameBranch.raw.length,
        afterFilterCount: nameMatched.length,
      });
    }

    return {
      items,
      debug: buildDebug({
        query: displayQuery,
        filters: rawFilters,
        branches,
        durationMs,
        raw: [
          ...(Array.isArray(imdbBranch.raw) ? imdbBranch.raw : []),
          ...(nameBranch ? nameBranch.raw : []),
        ],
        filtered: results,
        items,
      }),
    };
  }

  // Single free-text / IMDb-id query
  const branch = await fetchApibay(query!);
  let results = applyNameFilters(branch.valid, rawFilters);
  const items = results.slice(0, 20);
  const durationMs = Math.round(performance.now() - started);

  if (!import.meta.env.DEV) return items;

  return {
    items,
    debug: buildDebug({
      query: query!,
      filters: rawFilters,
      branches: [
        {
          label: "Single query",
          url: branch.url,
          rawCount: branch.raw.length,
          afterFilterCount: results.length,
        },
      ],
      durationMs,
      raw: branch.raw,
      filtered: results,
      items,
    }),
  };
}
