import { Code2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

/** DEV-only engraved "DEV" tab in the top-right. */
export function DevBookmark() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50">
      <span
        aria-label="Development mode"
        title="Development mode"
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full border border-black/60 px-2",
          "bg-[#0c0c0c] font-mono text-[0.625rem] font-semibold tracking-wide text-amber-300/90",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
        )}
      >
        <Code2Icon className="size-3 opacity-70" />
        DEV
      </span>
    </div>
  );
}
