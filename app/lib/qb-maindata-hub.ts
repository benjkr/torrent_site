import type { SyncMainData } from "@ctrl/qbittorrent";
import { qb } from "./qb-client";
import {
  applyMaindataDelta,
  emptyMaindataSnapshot,
  type MaindataDelta,
  type MaindataSnapshot,
  type MaindataWsMessage,
  snapshotToWsMessage,
} from "./maindata-types";

const POLL_MS = 1000;
const FAIL_RESET_THRESHOLD = 3;

export type MaindataHubStatus = {
  online: boolean;
  error?: string;
  version?: string;
};

export type MaindataHubEvent =
  | { type: "snapshot"; snapshot: MaindataSnapshot }
  | { type: "delta"; delta: MaindataDelta }
  | { type: "status"; status: MaindataHubStatus };

type Listener = (event: MaindataHubEvent) => void;

function toDelta(raw: SyncMainData): MaindataDelta {
  return {
    rid: raw.rid,
    full_update: raw.full_update,
    torrents: raw.torrents as MaindataDelta["torrents"],
    torrents_removed: raw.torrents_removed,
    categories: raw.categories as MaindataDelta["categories"],
    categories_removed: raw.categories_removed,
    tags: raw.tags,
    tags_removed: raw.tags_removed,
    server_state: raw.server_state as MaindataDelta["server_state"],
  };
}

class MaindataHub {
  private snapshot = emptyMaindataSnapshot();
  private status: MaindataHubStatus = { online: false };
  private rid = 0;
  private failCount = 0;
  private hasPolled = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private tickInFlight = false;
  private listeners = new Set<Listener>();

  start() {
    if (this.running) return;
    this.running = true;
    void this.tick();
  }

  stop() {
    this.running = false;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  getSnapshot(): MaindataSnapshot {
    return this.snapshot;
  }

  getStatus(): MaindataHubStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Messages a newly connected client should receive immediately. */
  getConnectMessages(): MaindataWsMessage[] {
    const messages: MaindataWsMessage[] = [];
    if (this.hasPolled) {
      messages.push({
        type: "status",
        online: this.status.online,
        error: this.status.error,
        version: this.status.version,
      });
    }
    if (this.snapshot.rid > 0 || Object.keys(this.snapshot.torrents).length > 0) {
      messages.push(snapshotToWsMessage(this.snapshot));
    }
    return messages;
  }

  private emit(event: MaindataHubEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  private setStatus(next: MaindataHubStatus) {
    const prev = this.status;
    const changed =
      prev.online !== next.online ||
      prev.error !== next.error ||
      prev.version !== next.version;
    this.status = next;
    if (changed) {
      this.emit({ type: "status", status: next });
    }
  }

  private scheduleNext() {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.tick();
    }, POLL_MS);
  }

  private async tick() {
    if (!this.running || this.tickInFlight) return;
    this.tickInFlight = true;
    try {
      const raw = await qb.getSyncMainData(this.rid);
      const delta = toDelta(raw);
      this.snapshot = applyMaindataDelta(this.snapshot, delta);
      this.rid = delta.rid;
      this.failCount = 0;

      let version = this.status.version;
      if (!version) {
        try {
          version = await qb.getAppVersion();
        } catch {
          version = "connected";
        }
      }

      this.hasPolled = true;
      this.setStatus({ online: true, version });
      this.emit({ type: "delta", delta });
    } catch (e) {
      this.failCount += 1;
      if (this.failCount >= FAIL_RESET_THRESHOLD) {
        this.rid = 0;
        this.failCount = 0;
      }
      this.hasPolled = true;
      this.setStatus({
        online: false,
        error:
          e instanceof Error
            ? e.message
            : "qBittorrent is unreachable",
        version: this.status.version,
      });
    } finally {
      this.tickInFlight = false;
      this.scheduleNext();
    }
  }
}

export const maindataHub = new MaindataHub();

export function attachMaindataWebSocket(ws: {
  send: (data: string) => void;
}): () => void {
  for (const msg of maindataHub.getConnectMessages()) {
    ws.send(JSON.stringify(msg));
  }

  const unsubscribe = maindataHub.subscribe((event) => {
    let message: MaindataWsMessage;
    if (event.type === "status") {
      message = {
        type: "status",
        online: event.status.online,
        error: event.status.error,
        version: event.status.version,
      };
    } else if (event.type === "delta") {
      message = { type: "delta", ...event.delta };
    } else {
      message = snapshotToWsMessage(event.snapshot);
    }
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // socket may already be closed
    }
  });

  return unsubscribe;
}

export const MAINDATA_WS_PATH = "/ws/maindata";
