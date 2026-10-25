import type { TorrentInfo } from "./types";

/** Partial torrent fields as returned by sync/maindata (keyed by hash). */
export type MaindataTorrent = {
  hash: string;
  name?: string;
  progress?: number;
  state?: string;
  dlspeed?: number;
  upspeed?: number;
  num_seeds?: number;
  num_leechs?: number;
  eta?: number;
  size?: number;
  save_path?: string;
  added_on?: number;
  completion_on?: number;
  category?: string;
  tags?: string;
  ratio?: number;
  [key: string]: unknown;
};

export type MaindataCategory = {
  name: string;
  savePath: string;
  [key: string]: unknown;
};

export type MaindataSnapshot = {
  rid: number;
  torrents: Record<string, MaindataTorrent>;
  categories: Record<string, MaindataCategory>;
  tags: string[];
  server_state: Record<string, unknown> | null;
};

/** Shape of a qBittorrent sync/maindata response (full or partial). */
export type MaindataDelta = {
  rid: number;
  full_update?: boolean;
  torrents?: Record<string, Partial<MaindataTorrent>>;
  torrents_removed?: string[];
  categories?: Record<string, MaindataCategory>;
  categories_removed?: string[];
  tags?: string[];
  tags_removed?: string[];
  server_state?: Record<string, unknown>;
};

export type MaindataWsSnapshotMessage = {
  type: "snapshot";
  rid: number;
  torrents: Record<string, MaindataTorrent>;
  categories: Record<string, MaindataCategory>;
  tags: string[];
  server_state: Record<string, unknown> | null;
};

export type MaindataWsDeltaMessage = {
  type: "delta";
} & MaindataDelta;

export type MaindataWsStatusMessage = {
  type: "status";
  online: boolean;
  error?: string;
  version?: string;
};

export type MaindataWsMessage =
  | MaindataWsSnapshotMessage
  | MaindataWsDeltaMessage
  | MaindataWsStatusMessage;

export function emptyMaindataSnapshot(): MaindataSnapshot {
  return {
    rid: 0,
    torrents: {},
    categories: {},
    tags: [],
    server_state: null,
  };
}

export function applyMaindataDelta(
  prev: MaindataSnapshot,
  delta: MaindataDelta,
): MaindataSnapshot {
  const next: MaindataSnapshot = {
    rid: delta.rid,
    torrents: prev.torrents,
    categories: prev.categories,
    tags: prev.tags,
    server_state: prev.server_state,
  };

  if (delta.full_update) {
    const torrents: Record<string, MaindataTorrent> = {};
    for (const [hash, partial] of Object.entries(delta.torrents ?? {})) {
      torrents[hash] = { ...partial, hash };
    }
    next.torrents = torrents;
    next.categories = { ...(delta.categories ?? {}) };
    next.tags = [...(delta.tags ?? [])];
  } else {
    if (delta.torrents) {
      const torrents = { ...prev.torrents };
      for (const [hash, partial] of Object.entries(delta.torrents)) {
        torrents[hash] = { ...torrents[hash], ...partial, hash };
      }
      next.torrents = torrents;
    }
    if (delta.torrents_removed?.length) {
      const torrents = { ...next.torrents };
      for (const hash of delta.torrents_removed) {
        delete torrents[hash];
      }
      next.torrents = torrents;
    }
    if (delta.categories) {
      next.categories = { ...next.categories, ...delta.categories };
    }
    if (delta.categories_removed?.length) {
      const categories = { ...next.categories };
      for (const name of delta.categories_removed) {
        delete categories[name];
      }
      next.categories = categories;
    }
    if (delta.tags?.length) {
      const tagSet = new Set(next.tags);
      for (const tag of delta.tags) tagSet.add(tag);
      next.tags = [...tagSet];
    }
    if (delta.tags_removed?.length) {
      const remove = new Set(delta.tags_removed);
      next.tags = next.tags.filter((t) => !remove.has(t));
    }
  }

  if (delta.server_state) {
    next.server_state = { ...(next.server_state ?? {}), ...delta.server_state };
  }

  return next;
}

export function torrentToInfo(t: MaindataTorrent): TorrentInfo {
  return {
    hash: t.hash,
    name: t.name ?? "",
    progress: t.progress ?? 0,
    state: String(t.state ?? ""),
    dlspeed: t.dlspeed ?? 0,
    upspeed: t.upspeed ?? 0,
    num_seeds: t.num_seeds ?? 0,
    num_leechs: t.num_leechs ?? 0,
    num_leechers: t.num_leechs ?? 0,
    eta: t.eta ?? 8640000,
    size: t.size ?? 0,
    save_path: t.save_path ?? "",
    added_on: t.added_on ?? 0,
    completion_on: t.completion_on ?? 0,
    category: t.category || "",
    tags: t.tags || "",
    ratio: t.ratio ?? 0,
  };
}

export function snapshotToTorrentInfos(
  snapshot: MaindataSnapshot,
): TorrentInfo[] {
  return Object.values(snapshot.torrents)
    .map(torrentToInfo)
    .sort((a, b) => (b.added_on || 0) - (a.added_on || 0));
}

export function snapshotToWsMessage(
  snapshot: MaindataSnapshot,
): MaindataWsSnapshotMessage {
  return {
    type: "snapshot",
    rid: snapshot.rid,
    torrents: snapshot.torrents,
    categories: snapshot.categories,
    tags: snapshot.tags,
    server_state: snapshot.server_state,
  };
}
