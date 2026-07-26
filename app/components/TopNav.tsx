import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Badge } from "@/components/ui/badge";
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

function navLinkClass(isActive: boolean, extra?: string) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-white/90 text-black shadow-sm"
      : "text-white/70 hover:bg-white/10 hover:text-white",
    extra,
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
        navLinkClass(
          isActive,
          cn(
            pulse && !disabled && "animate-pulse",
            disabled && "pointer-events-none opacity-40",
          ),
        )
      }
    >
      Library
      {!disabled && hasNew ? (
        <Badge
          variant="secondary"
          className="h-5 gap-1 border-0 bg-emerald-500/15 px-1.5 text-[0.625rem] font-semibold text-emerald-300"
          aria-label="New download added"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          New
        </Badge>
      ) : null}
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
            className={({ isActive }) => navLinkClass(isActive)}
          >
            Search
          </NavLink>
          <LibraryNavLink disabled={disabled} />
          <NavLink
            to="/settings"
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
            onClick={(e) => {
              if (disabled) e.preventDefault();
            }}
            className={({ isActive }) =>
              navLinkClass(
                isActive,
                disabled ? "pointer-events-none opacity-40" : undefined,
              )
            }
          >
            Settings
          </NavLink>
        </nav>
        <div aria-hidden />
      </div>
    </header>
  );
}
