import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMaindata, type MaindataConnectionState } from "./maindata";

export type QbStatusState =
  | { state: "loading" }
  | { state: "online"; version: string }
  | { state: "offline"; error: string };

export type QbStatusValue = QbStatusState & {
  online: boolean;
};

const QbStatusContext = createContext<QbStatusValue | null>(null);

function toQbStatus(connection: MaindataConnectionState): QbStatusState {
  if (connection.state === "connecting") {
    return { state: "loading" };
  }
  if (connection.state === "online") {
    return { state: "online", version: connection.version };
  }
  return { state: "offline", error: connection.error };
}

export function QbStatusProvider({ children }: { children: ReactNode }) {
  const { connection } = useMaindata();

  const value = useMemo<QbStatusValue>(() => {
    const status = toQbStatus(connection);
    return {
      ...status,
      online: status.state === "online",
    };
  }, [connection]);

  return (
    <QbStatusContext.Provider value={value}>{children}</QbStatusContext.Provider>
  );
}

export function useQbStatus(): QbStatusValue {
  const ctx = useContext(QbStatusContext);
  if (!ctx) {
    throw new Error("useQbStatus must be used within QbStatusProvider");
  }
  return ctx;
}
