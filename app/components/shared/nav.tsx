import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import {
  clearLibraryNew,
  hasLibraryNew,
  LIBRARY_NEW_EVENT,
} from "@/lib/download-notify";
import { cn } from "@/lib/utils";

export function useLibraryNew() {
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

export const navGlassShell = cn(
  "border border-white/20 bg-white/10",
  "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

export const navSoftActive = cn(
  "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/25",
);
export const navSoftIdle = "text-white/45 hover:bg-white/10 hover:text-white/85";

export function navSoftLinkClass(isActive: boolean, extra?: string) {
  return cn(
    "relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all",
    isActive ? navSoftActive : navSoftIdle,
    extra,
  );
}

export function LibraryDot() {
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
