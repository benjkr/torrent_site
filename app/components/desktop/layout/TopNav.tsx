import { NavLink } from "react-router";
import { SearchIcon } from "lucide-react";

import {
  LibraryDot,
  navGlassShell,
  navSoftActive,
  navSoftIdle,
  navSoftLinkClass,
  useLibraryNew,
} from "@/components/shared/nav";
import { cn } from "@/lib/utils";

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
        navSoftLinkClass(
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

export function TopNav({
  disabled,
  className,
}: {
  disabled: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "pointer-events-none sticky top-0 z-50 px-4 pt-4 pb-2",
        className,
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div aria-hidden />
        <nav
          className={cn(
            "pointer-events-auto flex items-center gap-0.5 rounded-full p-1",
            navGlassShell,
          )}
        >
          <NavLink
            to="/search"
            title="Search"
            aria-label="Search"
            className={({ isActive }) =>
              cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-all",
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
                navSoftLinkClass(
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
