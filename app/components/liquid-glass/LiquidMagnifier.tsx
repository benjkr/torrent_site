import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LiquidGlassFilter } from "@/lib/liquid-glass/LiquidGlassFilter";
import {
  FROSTED_FALLBACK_CLASS,
  supportsSvgBackdropFilter,
} from "@/lib/liquid-glass/support";
import { CONVEX } from "@/lib/liquid-glass/surfaceEquations";
import { cn } from "@/lib/utils";

export type LiquidMagnifierProps = {
  className?: string;
  width?: number;
  height?: number;
  children?: ReactNode;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
};

/**
 * Draggable liquid-glass lens that refracts content behind it.
 */
export function LiquidMagnifier({
  className,
  width = 180,
  height = 120,
  children,
  blur: blurProp = 0,
  refractionLevel = 1,
  specularOpacity: specularOpacityProp = 0.5,
  specularSaturation: specularSaturationProp = 9,
}: LiquidMagnifierProps) {
  const filterId = `lg-mag-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [canRefract, setCanRefract] = useState(false);
  const isDragging = useMotionValue(false);
  const velocityX = useMotionValue(0);

  const radius = height / 2;
  const specularOpacity = useMotionValue(specularOpacityProp);
  const specularSaturation = useMotionValue(specularSaturationProp);
  const refractionBase = useMotionValue(refractionLevel);
  const blur = useMotionValue(blurProp);

  useEffect(() => {
    setCanRefract(supportsSvgBackdropFilter());
  }, []);

  useEffect(() => {
    refractionBase.set(refractionLevel);
  }, [refractionLevel, refractionBase]);
  useEffect(() => {
    specularOpacity.set(specularOpacityProp);
  }, [specularOpacityProp, specularOpacity]);
  useEffect(() => {
    specularSaturation.set(specularSaturationProp);
  }, [specularSaturationProp, specularSaturation]);
  useEffect(() => {
    blur.set(blurProp);
  }, [blurProp, blur]);

  useEffect(() => {
    const handleUp = () => isDragging.set(false);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [isDragging]);

  const dragMultiplier = useTransform(isDragging, (d): number => (d ? 1 : 0.8));
  const scaleRatio = useSpring(
    useTransform(() => refractionBase.get() * dragMultiplier.get()),
    { stiffness: 250, damping: 14 },
  );
  const magnifyingScale = useSpring(
    useTransform(isDragging, (d): number => (d ? 48 : 24)),
    { stiffness: 250, damping: 14 },
  );
  const objectScale = useSpring(
    useTransform(isDragging, (d): number => (d ? 1 : 0.85)),
    { stiffness: 340, damping: 20 },
  );
  const objectScaleY = useSpring(
    useTransform(
      (): number =>
        objectScale.get() * Math.max(0.7, 1 - Math.abs(velocityX.get()) / 5000),
    ),
    { stiffness: 340, damping: 30 },
  );
  const objectScaleX = useSpring(
    useTransform((): number => objectScale.get() + (1 - objectScaleY.get())),
    { stiffness: 340, damping: 30 },
  );
  const boxShadow = useTransform(isDragging, (d) =>
    d
      ? "4px 16px 24px rgba(0,0,0,0.22), inset 2px 8px 24px rgba(0,0,0,0.2), inset -2px -8px 24px rgba(255,255,255,0.2)"
      : "0 4px 9px rgba(0,0,0,0.16), inset 0 2px 12px rgba(0,0,0,0.12), inset 0 -2px 12px rgba(255,255,255,0.12)",
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/15 bg-zinc-950",
        className,
      )}
    >
      <div className="relative min-h-[280px] p-6 text-white/80">{children}</div>

      <motion.div
        className="absolute top-6 left-6 z-10 cursor-grab active:cursor-grabbing"
        style={{
          width,
          height,
          borderRadius: radius,
          scaleX: objectScaleX,
          scaleY: objectScaleY,
        }}
        drag
        dragConstraints={containerRef}
        dragElastic={0.13}
        dragMomentum={false}
        onDrag={(_, info) => velocityX.set(info.velocity.x)}
        onDragEnd={() => velocityX.set(0)}
        onPointerDown={() => isDragging.set(true)}
      >
        {canRefract ? (
          <LiquidGlassFilter
            id={filterId}
            width={width}
            height={height}
            radius={radius}
            bezelWidth={25}
            glassThickness={110}
            refractiveIndex={1.5}
            blur={blur}
            scaleRatio={scaleRatio}
            specularOpacity={specularOpacity}
            specularSaturation={specularSaturation}
            magnifyingScale={magnifyingScale}
            bezelHeightFn={CONVEX.fn}
          />
        ) : null}
        <motion.div
          className={cn(
            "absolute inset-0 ring-1 ring-white/15",
            !canRefract && FROSTED_FALLBACK_CLASS,
          )}
          style={{
            borderRadius: radius,
            backdropFilter: canRefract ? `url(#${filterId})` : undefined,
            WebkitBackdropFilter: canRefract ? `url(#${filterId})` : undefined,
            boxShadow,
            transform: "translateZ(0)",
          }}
        />
      </motion.div>
    </div>
  );
}
