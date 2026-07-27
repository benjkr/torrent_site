/** True when SVG filters work as backdrop-filter (Chromium today). */
export function supportsSvgBackdropFilter(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return false;
  }
  try {
    return (
      CSS.supports("backdrop-filter", "url(#liquid-glass-probe)") ||
      CSS.supports("-webkit-backdrop-filter", "url(#liquid-glass-probe)")
    );
  } catch {
    return false;
  }
}

/** Site dense-glass frosted fallback when refraction is unavailable. */
export const FROSTED_FALLBACK_CLASS =
  "border border-white/20 bg-zinc-900/80 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl backdrop-saturate-150";
