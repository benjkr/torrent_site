import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "torrent_site:debug:force_qb_offline";

export const FORCE_QB_OFFLINE_ERROR =
  "[debug] Forced qBittorrent offline";

type QbDebugValue = {
  forceOffline: boolean;
  setForceOffline: (value: boolean) => void;
};

const QbDebugContext = createContext<QbDebugValue | null>(null);

function readStoredForceOffline(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredForceOffline(value: boolean) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** DEV-only: force the client into qB offline for UI debugging. */
export function QbDebugProvider({ children }: { children: ReactNode }) {
  const [forceOffline, setForceOfflineState] = useState(false);

  useEffect(() => {
    setForceOfflineState(readStoredForceOffline());
  }, []);

  const setForceOffline = useCallback((value: boolean) => {
    if (!import.meta.env.DEV) return;
    setForceOfflineState(value);
    writeStoredForceOffline(value);
  }, []);

  const value = useMemo<QbDebugValue>(
    () => ({
      forceOffline: import.meta.env.DEV ? forceOffline : false,
      setForceOffline,
    }),
    [forceOffline, setForceOffline],
  );

  return (
    <QbDebugContext.Provider value={value}>{children}</QbDebugContext.Provider>
  );
}

export function useQbDebug(): QbDebugValue {
  const ctx = useContext(QbDebugContext);
  if (!ctx) {
    throw new Error("useQbDebug must be used within QbDebugProvider");
  }
  return ctx;
}
