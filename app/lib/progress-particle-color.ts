import { parseHexRgb, softWashFill } from "@/lib/dominant-color";

export type Rgb = { r: number; g: number; b: number };
/** h,s,l in 0–1 */
export type Hsl = { h: number; s: number; l: number };

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case R:
      h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
      break;
    case G:
      h = ((B - R) / d + 2) / 6;
      break;
    default:
      h = ((R - G) / d + 4) / 6;
      break;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let T = t;
    if (T < 0) T += 1;
    if (T > 1) T -= 1;
    if (T < 1 / 6) return p + (q - p) * 6 * T;
    if (T < 1 / 2) return q;
    if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${r},${g},${b})`;
}

/** Relative luminance (sRGB, WCAG). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Approximate soft-wash fill over a dark frosted track. */
export function estimateWashOnTrack(
  base: Rgb,
  track: Rgb = { r: 28, g: 28, b: 30 },
  mix = 0.42,
): Rgb {
  return {
    r: Math.round(base.r * mix + track.r * (1 - mix)),
    g: Math.round(base.g * mix + track.g * (1 - mix)),
    b: Math.round(base.b * mix + track.b * (1 - mix)),
  };
}

export type ParticleColorDebug = {
  baseHex: string;
  base: Rgb;
  baseHsl: Hsl;
  wash: Rgb;
  particle: Rgb;
  particleHex: string;
  particleHsl: Hsl;
  /** Direction taken: lighten | darken */
  direction: "lighten" | "darken";
  contrastVsWash: number;
};

/**
 * Progress sparkle color from the bar’s solid hue.
 *
 * Keeps hue (and mostly saturation), but picks lightness so sparkles stay
 * readable on the soft-wash fill over dark frosted chrome — even when the
 * base is very dark (e.g. #4b3911) or very light.
 *
 * Steps:
 * 1. Parse base → HSL
 * 2. Estimate the on-bar wash (42% base over dark track)
 * 3. If wash is dark → lighten sparkles; if wash is light → darken
 * 4. Enforce a minimum ΔL from the base (~0.28) and clamp to a readable band
 * 5. Slightly boost S when lifting muddy dark colors
 */
export function progressParticleColor(hex: string): string | null {
  const debug = progressParticleColorDebug(hex);
  return debug ? rgbToCss(debug.particle) : null;
}

export function progressParticleColorDebug(
  hex: string,
): ParticleColorDebug | null {
  const base = parseHexRgb(hex);
  if (!base) return null;
  const baseHsl = rgbToHsl(base);
  const wash = estimateWashOnTrack(base);
  const washL = rgbToHsl(wash).l;

  const MIN_DELTA = 0.28;
  const BAND_LO = 0.28;
  const BAND_HI = 0.78;

  let direction: "lighten" | "darken";
  let particleL: number;
  let particleS = baseHsl.s;

  // Soft wash on dark UI is almost always darker than mid — prefer lightening
  // dark bases. Only darken when the wash itself is already light.
  if (washL < 0.48) {
    direction = "lighten";
    particleL = Math.max(baseHsl.l + MIN_DELTA, 0.58);
    particleL = Math.min(BAND_HI, particleL);
    // Muddy dark browns need a bit more chroma once lifted
    if (baseHsl.l < 0.35) {
      particleS = Math.min(1, baseHsl.s * 1.2 + 0.06);
    }
  } else {
    direction = "darken";
    particleL = Math.min(baseHsl.l - MIN_DELTA, 0.42);
    particleL = Math.max(BAND_LO, particleL);
  }

  // If contrast vs wash is still weak, nudge further in the same direction.
  let particle = hslToRgb({ h: baseHsl.h, s: particleS, l: particleL });
  let ratio = contrastRatio(particle, wash);
  const TARGET = 2.4;
  let guard = 0;
  while (ratio < TARGET && guard < 12) {
    guard += 1;
    if (direction === "lighten") {
      particleL = Math.min(BAND_HI, particleL + 0.04);
    } else {
      particleL = Math.max(BAND_LO, particleL - 0.04);
    }
    particle = hslToRgb({ h: baseHsl.h, s: particleS, l: particleL });
    ratio = contrastRatio(particle, wash);
  }

  const particleHsl = rgbToHsl(particle);
  return {
    baseHex: hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`,
    base,
    baseHsl,
    wash,
    particle,
    particleHex: rgbToHex(particle),
    particleHsl,
    direction,
    contrastVsWash: ratio,
  };
}

/** Soft-wash CSS for preview (same as library fill). */
export function progressWashCss(hex: string): string {
  return softWashFill(hex);
}
