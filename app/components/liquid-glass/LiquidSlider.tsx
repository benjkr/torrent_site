import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { LiquidGlassFilter } from "@/lib/liquid-glass/LiquidGlassFilter";
import {
  FROSTED_FALLBACK_CLASS,
  supportsSvgBackdropFilter,
} from "@/lib/liquid-glass/support";
import { CONVEX } from "@/lib/liquid-glass/surfaceEquations";
import { cn } from "@/lib/utils";

export type LiquidSliderProps = {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  width?: number;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
};

/** Convex liquid-glass range slider (controllable). */
export function LiquidSlider({
  value: valueProp,
  defaultValue = 30,
  min = 0,
  max = 100,
  onValueChange,
  disabled = false,
  className,
  width: sliderWidth = 280,
  blur: blurProp = 0,
  refractionLevel = 1,
  specularOpacity: specularOpacityProp = 0.4,
  specularSaturation: specularSaturationProp = 7,
}: LiquidSliderProps) {
  const filterId = `lg-slider-${useId().replace(/:/g, "")}`;
  const [canRefract, setCanRefract] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const sliderHeight = 14;
  const thumbWidth = 72;
  const thumbHeight = 48;
  const thumbRadius = thumbHeight / 2;
  const SCALE_REST = 0.6;
  const SCALE_DRAG = 1;
  const thumbWidthRest = thumbWidth * SCALE_REST;

  const value = useMotionValue(valueProp ?? defaultValue);
  const pointerDown = useMotionValue(0);
  const blur = useMotionValue(blurProp);
  const specularOpacity = useMotionValue(specularOpacityProp);
  const specularSaturation = useMotionValue(specularSaturationProp);
  const refractionBase = useMotionValue(refractionLevel);

  useEffect(() => {
    setCanRefract(supportsSvgBackdropFilter());
  }, []);

  useEffect(() => {
    if (valueProp !== undefined) value.set(valueProp);
  }, [valueProp, value]);

  useEffect(() => {
    blur.set(blurProp);
  }, [blurProp, blur]);
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
    const onPointerUp = () => pointerDown.set(0);
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [pointerDown]);

  const isUp = useTransform(() => (pointerDown.get() > 0.5 ? 1 : 0));
  const pressMultiplier = useTransform(() =>
    0.4 + 0.5 * isUp.get(),
  );
  const scaleRatio = useSpring(
    useTransform(() => pressMultiplier.get() * refractionBase.get()),
  );
  const scaleSpring = useSpring(
    useTransform((): number => (isUp.get() > 0.5 ? SCALE_DRAG : SCALE_REST)),
    { damping: 80, stiffness: 2000 },
  );
  const backgroundOpacity = useSpring(
    useTransform((): number => (isUp.get() > 0.5 ? 0.1 : 1)),
    { damping: 80, stiffness: 2000 },
  );
  const fillWidth = useTransform(value, (v) => `${((v - min) / (max - min)) * 100}%`);
  const thumbBg = useTransform(
    backgroundOpacity,
    (op) => `rgba(255, 255, 255, ${op})`,
  );

  function setFromClientX(clientX: number) {
    const track = trackRef.current?.getBoundingClientRect();
    if (!track) return;
    const x0 = track.left + thumbWidthRest / 2;
    const x100 = track.right - thumbWidthRest / 2;
    const ratio = Math.max(0, Math.min(1, (clientX - x0) / (x100 - x0)));
    const next = ratio * (max - min) + min;
    value.set(next);
    onValueChange?.(next);
  }

  return (
    <div
      className={cn(
        "relative select-none touch-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      style={{ width: sliderWidth, height: thumbHeight }}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value.get())}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className="absolute cursor-pointer"
        style={{
          width: sliderWidth,
          height: sliderHeight,
          left: 0,
          top: (thumbHeight - sliderHeight) / 2,
          backgroundColor: "#89898F66",
          borderRadius: sliderHeight / 2,
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          pointerDown.set(1);
          setFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = (max - min) / 20;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(max, value.get() + step);
            value.set(next);
            onValueChange?.(next);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max(min, value.get() - step);
            value.set(next);
            onValueChange?.(next);
          }
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          <motion.div
            style={{
              height: sliderHeight,
              width: fillWidth,
              borderRadius: 6,
              backgroundColor: "#0377F7",
            }}
          />
        </div>
      </div>

      {canRefract ? (
        <LiquidGlassFilter
          id={filterId}
          width={thumbWidth}
          height={thumbHeight}
          radius={thumbRadius}
          bezelWidth={16}
          glassThickness={80}
          refractiveIndex={1.45}
          blur={blur}
          scaleRatio={scaleRatio}
          specularOpacity={specularOpacity}
          specularSaturation={specularSaturation}
          bezelHeightFn={CONVEX.fn}
        />
      ) : null}

      <motion.div
        ref={thumbRef}
        drag={disabled ? false : "x"}
        dragConstraints={{
          left: -thumbWidthRest / 3,
          right: sliderWidth - thumbWidth + thumbWidthRest / 3,
        }}
        dragElastic={0.02}
        dragMomentum={false}
        onPointerDown={() => {
          if (!disabled) pointerDown.set(1);
        }}
        onDrag={(_, info) => {
          setFromClientX(info.point.x);
        }}
        onDragEnd={() => pointerDown.set(0)}
        className={cn("absolute cursor-pointer", !canRefract && FROSTED_FALLBACK_CLASS)}
        style={{
          height: thumbHeight,
          width: thumbWidth,
          top: 0,
          borderRadius: thumbRadius,
          backdropFilter: canRefract ? `url(#${filterId})` : undefined,
          WebkitBackdropFilter: canRefract ? `url(#${filterId})` : undefined,
          scale: scaleSpring,
          backgroundColor: thumbBg,
          boxShadow: "0 3px 14px rgba(0,0,0,0.12)",
          transform: "translateZ(0)",
        }}
      />
    </div>
  );
}
