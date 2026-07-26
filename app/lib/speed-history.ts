import { useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "library-speed-history-v1";
const MAX_POINTS = 24;
const SAMPLE_INTERVAL_MS = 1000;
const MAX_HASHES = 80;

export type SpeedSeries = {
  down: number[];
  up: number[];
  lastAt: number;
};

type StoreSnapshot = Record<string, SpeedSeries>;

const EMPTY: SpeedSeries = { down: [], up: [], lastAt: 0 };

function load(): StoreSnapshot {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreSnapshot;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

class SpeedHistoryStore {
  private data: StoreSnapshot = {};
  private listeners = new Set<() => void>();
  private persistTimer: number | undefined;
  private cache = new Map<string, SpeedSeries>();
  private hydrated = false;

  private ensureHydrated() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    this.data = load();
  }

  subscribe = (listener: () => void) => {
    this.ensureHydrated();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  private schedulePersist() {
    if (typeof window === "undefined") return;
    if (this.persistTimer !== undefined) return;
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = undefined;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch {
        // quota / private mode — ignore
      }
    }, 1500);
  }

  private prune() {
    const entries = Object.entries(this.data);
    if (entries.length <= MAX_HASHES) return;
    entries.sort((a, b) => a[1].lastAt - b[1].lastAt);
    const drop = entries.length - MAX_HASHES;
    for (let i = 0; i < drop; i++) {
      const key = entries[i]![0];
      delete this.data[key];
      this.cache.delete(key);
    }
  }

  get(hash: string): SpeedSeries {
    this.ensureHydrated();
    const s = this.data[hash];
    if (!s) return EMPTY;
    let cached = this.cache.get(hash);
    if (
      !cached ||
      cached.lastAt !== s.lastAt ||
      cached.down !== s.down ||
      cached.up !== s.up
    ) {
      cached = s;
      this.cache.set(hash, cached);
    }
    return cached;
  }

  /** Record a live sample (browser-only). Throttled per hash. */
  sample(hash: string, down: number, up: number) {
    if (!hash || typeof window === "undefined") return;
    this.ensureHydrated();
    const now = Date.now();
    const prev = this.data[hash];
    if (prev && now - prev.lastAt < SAMPLE_INTERVAL_MS) return;

    const nextDown = [...(prev?.down ?? [])];
    const nextUp = [...(prev?.up ?? [])];
    nextDown.push(Math.max(0, down || 0));
    nextUp.push(Math.max(0, up || 0));
    while (nextDown.length > MAX_POINTS) nextDown.shift();
    while (nextUp.length > MAX_POINTS) nextUp.shift();

    this.data[hash] = { down: nextDown, up: nextUp, lastAt: now };
    this.cache.set(hash, this.data[hash]!);
    this.prune();
    this.schedulePersist();
    this.emit();
  }
}

const store = new SpeedHistoryStore();

export function useTorrentSpeedHistory(
  hash: string,
  dlspeed: number,
  upspeed: number,
): SpeedSeries {
  const downRef = useRef(dlspeed);
  const upRef = useRef(upspeed);
  downRef.current = dlspeed;
  upRef.current = upspeed;

  useEffect(() => {
    store.sample(hash, dlspeed, upspeed);
  }, [hash, dlspeed, upspeed]);

  useEffect(() => {
    const id = window.setInterval(() => {
      store.sample(hash, downRef.current, upRef.current);
    }, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hash]);

  return useSyncExternalStore(
    store.subscribe,
    () => store.get(hash),
    () => EMPTY,
  );
}
