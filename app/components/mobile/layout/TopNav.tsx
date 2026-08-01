import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import {
  CloudOffIcon,
  LibraryIcon,
  SearchIcon,
  SettingsIcon,
  WifiIcon,
} from "lucide-react";

import {
  LibraryDot,
  navGlassShell,
  navSoftActive,
  navSoftIdle,
  useLibraryNew,
} from "@/components/shared/nav";
import { getAppVersion, type AppVersion } from "@/lib/app-version";
import { useQbStatus } from "@/lib/qb-status";
import { cn } from "@/lib/utils";

function MobileDockLibraryTab({ disabled }: { disabled?: boolean }) {
  const { hasNew, pulse, clear } = useLibraryNew();

  return (
    <NavLink
      to="/library"
      title="Library"
      aria-label="Library"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        clear();
      }}
      className={({ isActive }) =>
        cn(
          "relative flex flex-1 flex-col items-center justify-center rounded-[1.1rem] py-2 transition-all",
          isActive ? navSoftActive : navSoftIdle,
          pulse && !disabled && "animate-pulse",
          disabled && "pointer-events-none opacity-40",
        )
      }
    >
      {({ isActive }) => (
        <span className="relative">
          <LibraryIcon
            className="size-4"
            strokeWidth={isActive ? 2.25 : 1.75}
          />
          {!disabled && hasNew ? (
            <span className="absolute -top-0.5 -right-1">
              <LibraryDot />
            </span>
          ) : null}
        </span>
      )}
    </NavLink>
  );
}

/** Muted status line engraved just above the dock rim (design D). */
function DockStatusMarkers() {
  const baked = getAppVersion();
  const [version, setVersion] = useState<AppVersion>(baked);
  const status = useQbStatus();

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

  const titleParts = [
    `App ${version.tag} · ${version.commit}`,
    status.state === "online"
      ? `qBittorrent ${status.version}`
      : status.state === "offline"
        ? `qBittorrent offline: ${status.error}`
        : null,
  ].filter(Boolean);

  return (
    <div
      aria-label="App status"
      title={titleParts.join(" · ")}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-[calc(100%+2px)] justify-center px-4"
    >
      <span className="inline-flex max-w-full items-center gap-1.5 truncate font-mono text-[0.5rem] tracking-tight text-white/22">
        <span className="truncate text-white/22">{version.tag}</span>
        <span className="shrink-0 text-white/10">·</span>
        <span className="truncate text-white/16">{version.commit}</span>
        {status.state === "online" ? (
          <>
            <span className="shrink-0 text-white/10">·</span>
            <span
              className="inline-flex shrink-0 items-center gap-0.5 text-emerald-400/30"
              aria-label={`qBittorrent online, version ${status.version}`}
            >
              <WifiIcon className="size-2 opacity-70" />
              {status.version}
            </span>
          </>
        ) : status.state === "offline" ? (
          <>
            <span className="shrink-0 text-white/10">·</span>
            <span
              className="inline-flex shrink-0 items-center gap-0.5 text-red-400/35"
              aria-label={`qBittorrent offline: ${status.error}`}
            >
              <CloudOffIcon className="size-2 opacity-70" />
              off
            </span>
          </>
        ) : null}
      </span>
    </div>
  );
}

/** Mobile bottom glass tab bar — icons only (compact). */
export function TopNav({ disabled }: { disabled: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50",
        "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="relative">
        <DockStatusMarkers />
        <nav
          className={cn(
            "pointer-events-auto flex items-stretch gap-0.5 rounded-[1.35rem] p-1",
            navGlassShell,
          )}
        >
          <NavLink
            to="/search"
            title="Search"
            aria-label="Search"
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center rounded-[1.1rem] py-2 transition-all",
                isActive ? navSoftActive : navSoftIdle,
              )
            }
          >
            {({ isActive }) => (
              <SearchIcon
                className="size-4"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
            )}
          </NavLink>

          <MobileDockLibraryTab disabled={disabled} />

          <NavLink
            to="/settings"
            title="Settings"
            aria-label="Settings"
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
            onClick={(e) => {
              if (disabled) e.preventDefault();
            }}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center rounded-[1.1rem] py-2 transition-all",
                isActive ? navSoftActive : navSoftIdle,
                disabled && "pointer-events-none opacity-40",
              )
            }
          >
            {({ isActive }) => (
              <SettingsIcon
                className="size-4"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
