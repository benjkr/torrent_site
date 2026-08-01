import { useEffect, useState } from "react";

import { getAppVersion, type AppVersion } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const engravedPill = cn(
  "rounded-full border border-black/60",
  "bg-[#0c0c0c]",
  "shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
);

/** Always-visible engraved app version pill (tag · short commit). */
export function AppVersionPill({ className }: { className?: string }) {
  const baked = getAppVersion();
  const [version, setVersion] = useState<AppVersion>(baked);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let cancelled = false;

    const load = () => {
      void fetch("/api/app_version")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AppVersion | null) => {
          if (cancelled || !data?.tag || !data?.commit) return;
          setVersion((prev) =>
            prev.tag === data.tag && prev.commit === data.commit
              ? prev
              : { tag: data.tag, commit: data.commit },
          );
        })
        .catch(() => {
          // keep last known / baked value
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

  const { tag, commit } = version;

  return (
    <span
      title={`App ${tag} · ${commit}`}
      aria-label={`App version ${tag}, commit ${commit}`}
      className={cn(
        engravedPill,
        "inline-flex h-5 items-center gap-1.5 px-2",
        "font-mono text-[0.625rem] tracking-tight text-white/70",
        className,
      )}
    >
      <span className="text-white/85">{tag}</span>
      <span className="text-white/20">·</span>
      <span className="text-white/40">{commit}</span>
    </span>
  );
}
