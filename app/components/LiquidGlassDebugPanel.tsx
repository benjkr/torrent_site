import { DropletsIcon } from "lucide-react";

import { useLiquidGlassConfig } from "@/lib/liquid-glass/LiquidGlassConfigContext";
import { openLiquidGlassControlsWindow } from "@/lib/liquid-glass/sync";
import { cn } from "@/lib/utils";

/**
 * DEV launcher: opens liquid-glass sliders in a floating popup / separate tab
 * so the main page stays fully visible while tweaking.
 */
export function LiquidGlassDebugPanel() {
  const { dirty } = useLiquidGlassConfig();

  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      title="Open liquid glass controls in a floating window"
      onClick={() => openLiquidGlassControlsWindow()}
      className={cn(
        "fixed bottom-4 left-4 z-[60] inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.625rem] font-medium shadow-sm backdrop-blur-md transition-colors cursor-pointer",
        dirty
          ? "border-amber-400/40 bg-amber-500/20 text-amber-50"
          : "border-white/15 bg-black/50 text-muted-foreground hover:bg-black/65 hover:text-foreground",
      )}
    >
      <DropletsIcon className="size-3" />
      Liquid{dirty ? " *" : ""}
    </button>
  );
}
