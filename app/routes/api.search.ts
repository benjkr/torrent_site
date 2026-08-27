import type { LoaderFunctionArgs } from "react-router";
import { matchesEpisodeCode, normalizeImdbId } from "../lib/imdb";
import type {
  ApiItem,
  SearchDebugInfo,
  SearchDebugQueryBranch,
  SearchResponse,
} from "../lib/types";
import { fetchYts, ytsListUrl } from "../lib/yts.server";

const APYBAY_BASE = "https://apibay.org";
const DUAL_MODE_CAP = 20;
const SINGLE_QUERY_CAP = 40;

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

function tagPirateBay(item: ApiItem): ApiItem {
  return { ...item, tracker: "piratebay" };
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
    valid: list.filter(isValidRow).map(tagPirateBay),
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

/** Interleave unique piratebay / YTS rows so one source cannot fill the cap alone. */
function sliceFairMix(items: ApiItem[], cap: number): ApiItem[] {
  const pb: ApiItem[] = [];
  const yts: ApiItem[] = [];
  const other: ApiItem[] = [];
  for (const item of items) {
    if (item.tracker === "yts") yts.push(item);
    else if (item.tracker === "piratebay") pb.push(item);
    else other.push(item);
  }
  const out: ApiItem[] = [];
  let i = 0;
  while (out.length < cap && (i < pb.length || i < yts.length)) {
    if (i < pb.length) out.push(pb[i]!);
    if (out.length >= cap) break;
    if (i < yts.length) out.push(yts[i]!);
    i += 1;
  }
  for (const item of other) {
    if (out.length >= cap) break;
    out.push(item);
  }
  return out;
}

function tagRaw(source: "apibay" | "yts", rows: unknown[]): unknown[] {
  return rows.map((row) => ({ source, row }));
}

function branchFromSettled(
  label: string,
  url: string,
  outcome: PromiseSettledResult<{
    url: string;
    raw: unknown[];
    valid: ApiItem[];
  }>,
  afterFilterCount: number,
): SearchDebugQueryBranch {
  if (outcome.status === "fulfilled") {
    return {
      label,
      url: outcome.value.url,
      rawCount: outcome.value.raw.length,
      afterFilterCount,
    };
  }
  return {
    label,
    url,
    rawCount: 0,
    afterFilterCount: 0,
    error: String(outcome.reason),
  };
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
  const apibayBranch = opts.branches.find((b) => b.label.startsWith("Apibay"));
  return {
    query: opts.query,
    filters: opts.filters,
    apibayUrl: apibayBranch?.url ?? primary?.url ?? "",
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
    const items = results.slice(0, DUAL_MODE_CAP);

    const durationMs = Math.round(performance.now() - started);
    if (!import.meta.env.DEV) return items;

    const branches: SearchDebugQueryBranch[] = [
      {
        label: `Apibay · IMDb id + regex ${ep}`,
        url: imdbBranch.url,
        rawCount: imdbBranch.raw.length,
        afterFilterCount: imdbMatched.length,
      },
    ];
    if (nameBranch && nameQuery) {
      branches.push({
        label: `Apibay · Name + ${ep}`,
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

  const q = query as string;
  const [apibayOutcome, ytsOutcome] = await Promise.allSettled([
    fetchApibay(q),
    fetchYts(q),
  ]);

  const apibayValid =
    apibayOutcome.status === "fulfilled" ? apibayOutcome.value.valid : [];
  const ytsValid =
    ytsOutcome.status === "fulfilled" ? ytsOutcome.value.valid : [];
  const apibayRaw =
    apibayOutcome.status === "fulfilled" ? apibayOutcome.value.raw : [];
  const ytsRaw =
    ytsOutcome.status === "fulfilled" ? ytsOutcome.value.raw : [];

  let results = mergeByHash([apibayValid, ytsValid]);
  results = applyNameFilters(results, rawFilters);
  const items = sliceFairMix(results, SINGLE_QUERY_CAP);
  const durationMs = Math.round(performance.now() - started);

  if (!import.meta.env.DEV) return items;

  const pbAfter = results.filter((t) => t.tracker === "piratebay").length;
  const ytsAfter = results.filter((t) => t.tracker === "yts").length;

  return {
    items,
    debug: buildDebug({
      query: q,
      filters: rawFilters,
      branches: [
        branchFromSettled("Apibay", apibayUrlFor(q), apibayOutcome, pbAfter),
        branchFromSettled("YTS", ytsListUrl(q), ytsOutcome, ytsAfter),
      ],
      durationMs,
      raw: [...tagRaw("apibay", apibayRaw), ...tagRaw("yts", ytsRaw)],
      filtered: results,
      items,
    }),
  };
}
