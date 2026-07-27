import { useEffect, useState } from "react";
import { Code2Icon } from "lucide-react";

import type { AppVersion } from "@/lib/app-version";
import { cn } from "@/lib/utils";

/** DEV-only engraved "DEV" tab in the top-right (includes current git branch). */
export function DevBookmark() {
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

  if (!import.meta.env.DEV) return null;

  const label = branch ? `Development mode · ${branch}` : "Development mode";

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50">
      <span
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full border border-black/60 px-2",
          "bg-[#0c0c0c] font-mono text-[0.625rem] font-semibold tracking-wide text-amber-300/90",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
        )}
      >
        <Code2Icon className="size-3 opacity-70" />
        DEV
        {branch ? (
          <>
            <span className="text-amber-300/35">·</span>
            <span className="max-w-[12rem] truncate font-medium text-amber-300/70">
              {branch}
            </span>
          </>
        ) : null}
      </span>
    </div>
  );
}
