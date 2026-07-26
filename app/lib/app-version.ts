export type AppVersion = {
  tag: string;
  commit: string;
};

/** Build-time git tag + short commit (injected by Vite). */
export function getAppVersion(): AppVersion {
  return {
    tag: import.meta.env.VITE_APP_TAG || "0.0.0",
    commit: import.meta.env.VITE_APP_COMMIT || "unknown",
  };
}
