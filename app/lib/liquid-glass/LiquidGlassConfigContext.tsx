import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LIQUID_GLASS_CONFIG,
  parseLiquidGlassConfig,
  type LiquidGlassConfig,
} from "@/lib/liquid-glass/config";
import {
  LIQUID_GLASS_SYNC_CHANNEL,
  type LiquidGlassSyncMessage,
} from "@/lib/liquid-glass/sync";

type LiquidGlassConfigContextValue = {
  /** Live params (draft). Surfaces read this. */
  config: LiquidGlassConfig;
  /** Last values written to / loaded from the repo file. */
  saved: LiquidGlassConfig;
  dirty: boolean;
  setConfig: (
    next: LiquidGlassConfig | ((prev: LiquidGlassConfig) => LiquidGlassConfig),
  ) => void;
  setParam: <K extends keyof LiquidGlassConfig>(
    key: K,
    value: LiquidGlassConfig[K],
  ) => void;
  resetToSaved: () => void;
  /** Persist draft to liquid-glass.config.json in the repo (DEV only). */
  saveToRepo: () => Promise<{ ok: true } | { ok: false; error: string }>;
  saving: boolean;
};

const LiquidGlassConfigContext =
  createContext<LiquidGlassConfigContextValue | null>(null);

function configsEqual(a: LiquidGlassConfig, b: LiquidGlassConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function LiquidGlassConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [saved, setSaved] = useState<LiquidGlassConfig>(LIQUID_GLASS_CONFIG);
  const [config, setConfigState] =
    useState<LiquidGlassConfig>(LIQUID_GLASS_CONFIG);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const applyingRemote = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef({ config: LIQUID_GLASS_CONFIG, saved: LIQUID_GLASS_CONFIG });

  stateRef.current = { config, saved };

  const committedKey = JSON.stringify(LIQUID_GLASS_CONFIG);

  const broadcast = useCallback((msg: LiquidGlassSyncMessage) => {
    if (!import.meta.env.DEV) return;
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      // ignore
    }
  }, []);

  // Cross-tab / popup sync (DEV).
  useEffect(() => {
    if (!import.meta.env.DEV || typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(LIQUID_GLASS_SYNC_CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<LiquidGlassSyncMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "request-sync") {
        const { config: c, saved: s } = stateRef.current;
        channel.postMessage({
          type: "draft",
          config: c,
          saved: s,
        } satisfies LiquidGlassSyncMessage);
        return;
      }

      if (msg.type === "draft") {
        applyingRemote.current = true;
        const nextConfig = parseLiquidGlassConfig(msg.config);
        const nextSaved = parseLiquidGlassConfig(msg.saved);
        setSaved(nextSaved);
        setConfigState(nextConfig);
        dirtyRef.current = !configsEqual(nextConfig, nextSaved);
        return;
      }

      if (msg.type === "saved") {
        applyingRemote.current = true;
        const next = parseLiquidGlassConfig(msg.config);
        dirtyRef.current = false;
        setSaved(next);
        setConfigState(next);
      }
    };

    channel.postMessage({ type: "request-sync" } satisfies LiquidGlassSyncMessage);

    return () => {
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, []);

  // Sync when the committed JSON changes (Save → disk → Vite HMR).
  useEffect(() => {
    const next = parseLiquidGlassConfig(JSON.parse(committedKey));
    setSaved(next);
    if (!dirtyRef.current) {
      setConfigState(next);
    }
  }, [committedKey]);

  // Broadcast local draft changes to other windows.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    broadcast({ type: "draft", config, saved });
  }, [config, saved, broadcast]);

  const setConfig = useCallback(
    (
      next: LiquidGlassConfig | ((prev: LiquidGlassConfig) => LiquidGlassConfig),
    ) => {
      setConfigState((prev) => {
        const resolved = parseLiquidGlassConfig(
          typeof next === "function" ? next(prev) : next,
          prev,
        );
        dirtyRef.current = !configsEqual(resolved, saved);
        return resolved;
      });
    },
    [saved],
  );

  const setParam = useCallback(
    <K extends keyof LiquidGlassConfig>(
      key: K,
      value: LiquidGlassConfig[K],
    ) => {
      setConfigState((prev) => {
        const resolved = parseLiquidGlassConfig({ ...prev, [key]: value }, prev);
        dirtyRef.current = !configsEqual(resolved, saved);
        return resolved;
      });
    },
    [saved],
  );

  const resetToSaved = useCallback(() => {
    dirtyRef.current = false;
    setConfigState(saved);
  }, [saved]);

  const saveToRepo = useCallback(async () => {
    if (!import.meta.env.DEV) {
      return { ok: false as const, error: "Save is DEV-only" };
    }
    setSaving(true);
    try {
      const res = await fetch("/api/liquid_glass_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 404) {
        return {
          ok: false as const,
          error: "Config API unavailable (production)",
        };
      }
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; config?: LiquidGlassConfig; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.config) {
        return {
          ok: false as const,
          error: data?.error ?? `Save failed (${res.status})`,
        };
      }
      const normalized = parseLiquidGlassConfig(data.config);
      dirtyRef.current = false;
      setSaved(normalized);
      setConfigState(normalized);
      broadcast({ type: "saved", config: normalized });
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Save failed",
      };
    } finally {
      setSaving(false);
    }
  }, [config, broadcast]);

  const dirty = !configsEqual(config, saved);
  dirtyRef.current = dirty;

  const value = useMemo<LiquidGlassConfigContextValue>(
    () => ({
      config,
      saved,
      dirty,
      setConfig,
      setParam,
      resetToSaved,
      saveToRepo,
      saving,
    }),
    [
      config,
      saved,
      dirty,
      setConfig,
      setParam,
      resetToSaved,
      saveToRepo,
      saving,
    ],
  );

  return (
    <LiquidGlassConfigContext.Provider value={value}>
      {children}
    </LiquidGlassConfigContext.Provider>
  );
}

export function useLiquidGlassConfig(): LiquidGlassConfigContextValue {
  const ctx = useContext(LiquidGlassConfigContext);
  if (!ctx) {
    return {
      config: LIQUID_GLASS_CONFIG,
      saved: LIQUID_GLASS_CONFIG,
      dirty: false,
      setConfig: () => {},
      setParam: () => {},
      resetToSaved: () => {},
      saveToRepo: async () => ({ ok: false, error: "No provider" }),
      saving: false,
    };
  }
  return ctx;
}
