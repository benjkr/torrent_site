import type { CSSProperties, ReactNode } from "react";
import { LiquidGlassSurface } from "@/components/liquid-glass/LiquidGlassSurface";
import { cn } from "@/lib/utils";

export type LiquidCardProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  radius?: number;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
  tintOpacity?: number;
};

/**
 * Glass card/panel shell — music-player-style liquid surface for arbitrary content.
 */
export function LiquidCard({
  children,
  className,
  style,
  width,
  height,
  radius = 28,
  blur,
  refractionLevel,
  specularOpacity,
  specularSaturation,
  tintOpacity,
}: LiquidCardProps) {
  return (
    <LiquidGlassSurface
      width={width}
      height={height}
      radius={radius}
      blur={blur}
      refractionLevel={refractionLevel}
      specularOpacity={specularOpacity}
      specularSaturation={specularSaturation}
      tintOpacity={tintOpacity}
      className={cn("text-white/90 shadow-xl", className)}
      style={style}
    >
      <div className="p-4 sm:p-5">{children}</div>
    </LiquidGlassSurface>
  );
}
