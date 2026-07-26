import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyMaindataDelta,
  emptyMaindataSnapshot,
  snapshotToTorrentInfos,
  type MaindataSnapshot,
  type MaindataWsMessage,
} from "./maindata-types";
import { FORCE_QB_OFFLINE_ERROR, useQbDebug } from "./qb-debug";
import type { TorrentInfo } from "./types";

const MAINDATA_WS_PATH = "/ws/maindata";
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export type MaindataConnectionState =
  | { state: "connecting" }
  | { state: "online"; version: string }
  | { state: "offline"; error: string };

export type MaindataValue = {
  connection: MaindataConnectionState;
  online: boolean;
  snapshot: MaindataSnapshot;
  torrents: TorrentInfo[];
};

const MaindataContext = createContext<MaindataValue | null>(null);

function getMaindataWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_MAINDATA_WS_PORT || "3001";
    return `${proto}//${window.location.hostname}:${port}${MAINDATA_WS_PATH}`;
  }
  return `${proto}//${window.location.host}${MAINDATA_WS_PATH}`;
}

function isMaindataMessage(value: unknown): value is MaindataWsMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value.type === "snapshot" ||
      value.type === "delta" ||
      value.type === "status")
  );
}

export function MaindataProvider({ children }: { children: ReactNode }) {
  const { forceOffline } = useQbDebug();
  const [connection, setConnection] = useState<MaindataConnectionState>({
    state: "connecting",
  });
  const [snapshot, setSnapshot] = useState<MaindataSnapshot>(
    emptyMaindataSnapshot,
  );

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | undefined;
    let reconnectTimer: number | undefined;
    let attempt = 0;

    const clearReconnect = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnect();
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_MIN_MS * 2 ** attempt,
      );
      attempt += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (cancelled) return;
      clearReconnect();
      setConnection((prev) =>
        prev.state === "online" ? prev : { state: "connecting" },
      );

      const socket = new WebSocket(getMaindataWsUrl());
      ws = socket;

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (!isMaindataMessage(parsed)) return;

        if (parsed.type === "status") {
          if (parsed.online) {
            setConnection({
              state: "online",
              version: parsed.version || "connected",
            });
          } else {
            setConnection({
              state: "offline",
              error: parsed.error || "qBittorrent is unreachable",
            });
          }
          return;
        }

        if (parsed.type === "snapshot") {
          setSnapshot({
            rid: parsed.rid,
            torrents: parsed.torrents,
            categories: parsed.categories,
            tags: parsed.tags,
            server_state: parsed.server_state,
          });
          return;
        }

        setSnapshot((prev) => applyMaindataDelta(prev, parsed));
      };

      socket.onerror = () => {
        // onclose handles reconnect
      };

      socket.onclose = () => {
        if (cancelled) return;
        setConnection({
          state: "offline",
          error: "Disconnected from maindata sync",
        });
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnect();
      ws?.close();
    };
  }, []);

  const value = useMemo<MaindataValue>(() => {
    const effectiveConnection: MaindataConnectionState = forceOffline
      ? { state: "offline", error: FORCE_QB_OFFLINE_ERROR }
      : connection;
    const online = effectiveConnection.state === "online";
    return {
      connection: effectiveConnection,
      online,
      snapshot,
      torrents: online ? snapshotToTorrentInfos(snapshot) : [],
    };
  }, [connection, forceOffline, snapshot]);

  return (
    <MaindataContext.Provider value={value}>
      {children}
    </MaindataContext.Provider>
  );
}

export function useMaindata(): MaindataValue {
  const ctx = useContext(MaindataContext);
  if (!ctx) {
    throw new Error("useMaindata must be used within MaindataProvider");
  }
  return ctx;
}
