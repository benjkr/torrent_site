import type { LiquidGlassConfig } from "@/lib/liquid-glass/config";

export const LIQUID_GLASS_SYNC_CHANNEL = "torrent-site:liquid-glass-config";

export type LiquidGlassSyncMessage =
  | { type: "draft"; config: LiquidGlassConfig; saved: LiquidGlassConfig }
  | { type: "saved"; config: LiquidGlassConfig }
  | { type: "request-sync" };

/** Open liquid-glass sliders in a floating popup (falls back to a new tab). */
export function openLiquidGlassControlsWindow(): Window | null {
  if (typeof window === "undefined") return null;
  const url = "/debug/liquid-glass-controls";
  const features =
    "popup=yes,width=400,height=760,left=24,top=24,resizable=yes,scrollbars=yes";
  const win = window.open(url, "liquidGlassControls", features);
  if (win) {
    try {
      win.focus();
    } catch {
      // ignore
    }
    return win;
  }
  return window.open(url, "_blank");
}
