import type { BezelType } from "./surfaceEquations";
import raw from "./liquid-glass.config.json";

/** Optical params shared by LiquidGlassSurface (and kit defaults). */
export type LiquidGlassConfig = {
  bezelWidth: number;
  glassThickness: number;
  refractiveIndex: number;
  blur: number;
  refractionLevel: number;
  specularOpacity: number;
  specularSaturation: number;
  tintOpacity: number;
  bezelType: BezelType;
};

const BEZEL_TYPES: BezelType[] = [
  "convex_circle",
  "convex_squircle",
  "concave",
  "lip",
];

/** Hardcoded seed used only while parsing (avoids TDZ on LIQUID_GLASS_CONFIG). */
const FALLBACK_SEED: LiquidGlassConfig = {
  bezelWidth: 16,
  glassThickness: 70,
  refractiveIndex: 1.4,
  blur: 0.8,
  refractionLevel: 0.75,
  specularOpacity: 0.28,
  specularSaturation: 4,
  tintOpacity: 0.07,
  bezelType: "convex_squircle",
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Validate / normalize a partial or unknown payload into a full config. */
export function parseLiquidGlassConfig(
  input: unknown,
  fallback: LiquidGlassConfig = FALLBACK_SEED,
): LiquidGlassConfig {
  const src =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const bezelType = BEZEL_TYPES.includes(src.bezelType as BezelType)
    ? (src.bezelType as BezelType)
    : fallback.bezelType;

  return {
    bezelWidth: clamp(Number(src.bezelWidth ?? fallback.bezelWidth), 1, 80),
    glassThickness: clamp(
      Number(src.glassThickness ?? fallback.glassThickness),
      10,
      300,
    ),
    refractiveIndex: clamp(
      Number(src.refractiveIndex ?? fallback.refractiveIndex),
      1.01,
      2.5,
    ),
    blur: clamp(Number(src.blur ?? fallback.blur), 0, 40),
    refractionLevel: clamp(
      Number(src.refractionLevel ?? fallback.refractionLevel),
      0,
      2,
    ),
    specularOpacity: clamp(
      Number(src.specularOpacity ?? fallback.specularOpacity),
      0,
      1,
    ),
    specularSaturation: clamp(
      Number(src.specularSaturation ?? fallback.specularSaturation),
      0,
      50,
    ),
    tintOpacity: clamp(Number(src.tintOpacity ?? fallback.tintOpacity), 0, 1),
    bezelType,
  };
}

/** Committed defaults — edit via DEV Liquid Glass panel → Save. */
export const LIQUID_GLASS_CONFIG: LiquidGlassConfig =
  parseLiquidGlassConfig(raw);

export const LIQUID_GLASS_PARAM_META: {
  key: Exclude<keyof LiquidGlassConfig, "bezelType">;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "bezelWidth", label: "Bezel width", min: 1, max: 48, step: 1 },
  {
    key: "glassThickness",
    label: "Glass thickness",
    min: 20,
    max: 200,
    step: 1,
  },
  {
    key: "refractiveIndex",
    label: "Refractive index",
    min: 1.1,
    max: 2,
    step: 0.01,
  },
  { key: "blur", label: "Blur", min: 0, max: 12, step: 0.1 },
  {
    key: "refractionLevel",
    label: "Refraction",
    min: 0,
    max: 1.5,
    step: 0.01,
  },
  {
    key: "specularOpacity",
    label: "Specular opacity",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "specularSaturation",
    label: "Specular sat.",
    min: 0,
    max: 20,
    step: 0.5,
  },
  { key: "tintOpacity", label: "Tint", min: 0, max: 0.4, step: 0.01 },
];

export const LIQUID_GLASS_BEZEL_OPTIONS: { id: BezelType; label: string }[] = [
  { id: "convex_squircle", label: "Squircle" },
  { id: "convex_circle", label: "Circle" },
  { id: "concave", label: "Concave" },
  { id: "lip", label: "Lip" },
];

export function formatLiquidGlassConfigJson(config: LiquidGlassConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
