import { useEffect, useState } from "react";

import type { AppVersion } from "@/lib/app-version";

/** DEV-only: poll `/api/app_version` for the current git branch. */
export function useDevBranch() {
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let cancelled = false;

    const load = () => {
      void fetch("/api/app_version")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AppVersion | null) => {
          if (cancelled || !data?.branch) return;
          setBranch((prev) => (prev === data.branch ? prev : data.branch!));
        })
        .catch(() => {
          // keep last known value
        });
    };

    load();

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, []);

  return branch;
}
