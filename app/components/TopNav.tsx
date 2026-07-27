import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  clearLibraryNew,
  hasLibraryNew,
  LIBRARY_NEW_EVENT,
} from "@/lib/download-notify";

function useLibraryNew() {
  const location = useLocation();
  const [hasNew, setHasNew] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setHasNew(hasLibraryNew());
    let pulseTimer: number | undefined;
    const onNew = () => {
      const next = hasLibraryNew();
      setHasNew(next);
      if (next) {
        setPulse(true);
        window.clearTimeout(pulseTimer);
        pulseTimer = window.setTimeout(() => setPulse(false), 1600);
      }
    };
    window.addEventListener(LIBRARY_NEW_EVENT, onNew);
    return () => {
      window.removeEventListener(LIBRARY_NEW_EVENT, onNew);
      window.clearTimeout(pulseTimer);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/library")) {
      clearLibraryNew();
      setHasNew(false);
      setPulse(false);
    }
  }, [location.pathname]);

  const clear = () => {
    clearLibraryNew();
    setHasNew(false);
    setPulse(false);
  };

  return { hasNew, pulse, clear };
}

const glassShell = cn(
  "border border-white/20 bg-white/10",
  "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

const softActive = cn(
  "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/25",
);
const softIdle = "text-white/45 hover:bg-white/10 hover:text-white/85";

function softLinkClass(isActive: boolean, extra?: string) {
  return cn(
    "relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all",
    isActive ? softActive : softIdle,
    extra,
  );
}

function LibraryDot() {
  return (
    <span
      className="relative flex size-1.5"
      aria-label="New download added"
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
    </span>
  );
}

function LibraryNavLink({ disabled }: { disabled?: boolean }) {
  const { hasNew, pulse, clear } = useLibraryNew();

  return (
    <NavLink
      to="/library"
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
        softLinkClass(
          isActive,
          cn(
            pulse && !disabled && "animate-pulse",
            disabled && "pointer-events-none opacity-40",
          ),
        )
      }
    >
      Library
      {!disabled && hasNew ? <LibraryDot /> : null}
    </NavLink>
  );
}

export function TopNav({ disabled }: { disabled: boolean }) {
  return (
    <header className="pointer-events-none sticky top-0 z-50 px-4 pt-4 pb-2">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div aria-hidden />
        <nav
          className={cn(
            "pointer-events-auto flex items-center gap-0.5 rounded-full p-1",
            glassShell,
          )}
        >
          <NavLink
            to="/search"
            title="Search"
            aria-label="Search"
            className={({ isActive }) =>
              cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-all",
                isActive ? softActive : softIdle,
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

          <span aria-hidden className="mx-0.5 h-4 w-px bg-white/15" />

          <div className="flex items-center gap-0.5">
            <LibraryNavLink disabled={disabled} />
            <NavLink
              to="/settings"
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : undefined}
              onClick={(e) => {
                if (disabled) e.preventDefault();
              }}
              className={({ isActive }) =>
                softLinkClass(
                  isActive,
                  disabled ? "pointer-events-none opacity-40" : undefined,
                )
              }
            >
              Settings
            </NavLink>
          </div>
        </nav>
        <div aria-hidden />
      </div>
    </header>
  );
}
