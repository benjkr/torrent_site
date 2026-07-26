import { NavLink } from "react-router";
import { CloudOffIcon } from "lucide-react";

import { DEBUG_PAGES } from "@/lib/debug-pages";
import { useQbDebug } from "@/lib/qb-debug";
import { cn } from "@/lib/utils";

/** Dev-only global controls + temp design pages, above the page Debug button. */
export function DebugPagesNav() {
  if (!import.meta.env.DEV) return null;

  const { forceOffline, setForceOffline } = useQbDebug();

  return (
    <div className="fixed bottom-14 right-4 z-[61] flex max-h-[40vh] flex-col-reverse items-end gap-1 overflow-y-auto">
      {DEBUG_PAGES.length > 0 ? (
        <nav
          aria-label="Debug design pages"
          className="flex flex-col-reverse items-end gap-1"
        >
          {DEBUG_PAGES.map((page) => (
            <NavLink
              key={page.path}
              to={page.path}
              className={({ isActive }) =>
                cn(
                  "rounded-md border px-2 py-1 text-[0.625rem] font-medium shadow-sm backdrop-blur-md transition-colors",
                  isActive
                    ? "border-white/25 bg-white/15 text-foreground"
                    : "border-white/15 bg-black/50 text-muted-foreground hover:bg-black/65 hover:text-foreground",
                )
              }
            >
              {page.label}
            </NavLink>
          ))}
        </nav>
      ) : null}

      <button
        type="button"
        title={
          forceOffline
            ? "Clear forced offline — restore real qB connection state"
            : "Force qBittorrent offline to debug site behavior"
        }
        aria-pressed={forceOffline}
        onClick={() => setForceOffline(!forceOffline)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.625rem] font-medium shadow-sm backdrop-blur-md transition-colors cursor-pointer",
          forceOffline
            ? "border-red-400/40 bg-red-500/25 text-red-100"
            : "border-white/15 bg-black/50 text-muted-foreground hover:bg-black/65 hover:text-foreground",
        )}
      >
        <CloudOffIcon className="size-3" />
        {forceOffline ? "Force offline: ON" : "Force offline"}
      </button>
    </div>
  );
}
