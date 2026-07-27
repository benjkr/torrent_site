import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LiquidGlassFilter } from "@/lib/liquid-glass/LiquidGlassFilter";
import { useLiquidGlassConfig } from "@/lib/liquid-glass/LiquidGlassConfigContext";
import {
  FROSTED_FALLBACK_CLASS,
  supportsSvgBackdropFilter,
} from "@/lib/liquid-glass/support";
import {
  bezelFnForType,
  type BezelType,
} from "@/lib/liquid-glass/surfaceEquations";
import { cn } from "@/lib/utils";

export type LiquidGlassSurfaceProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Explicit size; if omitted, measured via ResizeObserver. */
  width?: number;
  height?: number;
  radius?: number;
  /** Override global liquid-glass.config.json (omit to use live/global). */
  bezelWidth?: number;
  glassThickness?: number;
  refractiveIndex?: number;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
  bezelType?: BezelType;
  tintOpacity?: number;
  magnifyingScale?: number;
  /** Force frosted fallback even in Chromium. */
  forceFallback?: boolean;
};

/**
 * Generic liquid-glass panel. Optics default to the global config
 * (`liquid-glass.config.json` + DEV panel). Explicit props still override.
 */
export function LiquidGlassSurface({
  children,
  className,
  style,
  width: widthProp,
  height: heightProp,
  radius: radiusProp,
  bezelWidth: bezelWidthProp,
  glassThickness: glassThicknessProp,
  refractiveIndex: refractiveIndexProp,
  blur: blurProp,
  refractionLevel: refractionLevelProp,
  specularOpacity: specularOpacityProp,
  specularSaturation: specularSaturationProp,
  bezelType: bezelTypeProp,
  tintOpacity: tintOpacityProp,
  magnifyingScale,
  forceFallback = false,
}: LiquidGlassSurfaceProps) {
  const { config } = useLiquidGlassConfig();
  const bezelWidth = bezelWidthProp ?? config.bezelWidth;
  const glassThickness = glassThicknessProp ?? config.glassThickness;
  const refractiveIndex = refractiveIndexProp ?? config.refractiveIndex;
  const blur = blurProp ?? config.blur;
  const refractionLevel = refractionLevelProp ?? config.refractionLevel;
  const specularOpacity = specularOpacityProp ?? config.specularOpacity;
  const specularSaturation =
    specularSaturationProp ?? config.specularSaturation;
  const bezelType = bezelTypeProp ?? config.bezelType;
  const tintOpacity = tintOpacityProp ?? config.tintOpacity;

  const reactId = useId();
  const filterId = `lg-${reactId.replace(/:/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: widthProp ?? 0,
    height: heightProp ?? 0,
  });
  const [canRefract, setCanRefract] = useState(false);

  useEffect(() => {
    setCanRefract(!forceFallback && supportsSvgBackdropFilter());
  }, [forceFallback]);

  useEffect(() => {
    if (widthProp != null && heightProp != null) {
      setSize({ width: widthProp, height: heightProp });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(1, Math.round(width / 4) * 4),
        height: Math.max(1, Math.round(height / 2) * 2),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthProp, heightProp]);

  const width = widthProp ?? size.width;
  const height = heightProp ?? size.height;
  const radius = radiusProp ?? (Math.min(width, height) / 2 || 16);

  const useRefraction = canRefract && width > 0 && height > 0;

  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden",
        !useRefraction && FROSTED_FALLBACK_CLASS,
        className,
      )}
      style={{
        borderRadius: radius,
        width: widthProp,
        height: heightProp,
        ...style,
      }}
    >
      {useRefraction ? (
        <>
          <LiquidGlassFilter
            id={filterId}
            width={width}
            height={height}
            radius={radius}
            bezelWidth={Math.min(bezelWidth, radius)}
            glassThickness={glassThickness}
            refractiveIndex={refractiveIndex}
            blur={blur}
            scaleRatio={refractionLevel}
            specularOpacity={specularOpacity}
            specularSaturation={specularSaturation}
            bezelHeightFn={bezelFnForType(bezelType)}
            magnifyingScale={magnifyingScale}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: radius,
              backdropFilter: `url(#${filterId})`,
              WebkitBackdropFilter: `url(#${filterId})`,
              backgroundColor: `rgba(255, 255, 255, ${tintOpacity})`,
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.28)",
              transform: "translateZ(0)",
            }}
          />
        </>
      ) : null}
      <div
        className={cn(
          "relative z-10",
          heightProp != null && widthProp != null && "h-full w-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
