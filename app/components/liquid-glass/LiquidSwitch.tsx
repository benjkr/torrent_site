import { mix, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useState } from "react";
import { LiquidGlassFilter } from "@/lib/liquid-glass/LiquidGlassFilter";
import {
  FROSTED_FALLBACK_CLASS,
  supportsSvgBackdropFilter,
} from "@/lib/liquid-glass/support";
import { LIP } from "@/lib/liquid-glass/surfaceEquations";
import { cn } from "@/lib/utils";

export type LiquidSwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
};

/** Lip-bezel liquid-glass toggle (controllable). */
export function LiquidSwitch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  blur: blurProp = 0.2,
  refractionLevel = 1,
  specularOpacity: specularOpacityProp = 0.5,
  specularSaturation: specularSaturationProp = 6,
}: LiquidSwitchProps) {
  const filterId = `lg-switch-${useId().replace(/:/g, "")}`;
  const [canRefract, setCanRefract] = useState(false);

  const sliderHeight = 40;
  const sliderWidth = 72;
  const thumbWidth = 64;
  const thumbHeight = 48;
  const thumbRadius = thumbHeight / 2;

  const THUMB_REST_SCALE = 0.65;
  const THUMB_ACTIVE_SCALE = 0.9;
  const THUMB_REST_OFFSET = ((1 - THUMB_REST_SCALE) * thumbWidth) / 2;
  const TRAVEL =
    sliderWidth -
    sliderHeight -
    (thumbWidth - thumbHeight) * THUMB_REST_SCALE;

  const checked = useMotionValue(checkedProp ?? defaultChecked ? 1 : 0);
  const pointerDown = useMotionValue(0);
  const xDragRatio = useMotionValue(0);
  const initialPointerX = useMotionValue(0);
  const blur = useMotionValue(blurProp);
  const specularOpacity = useMotionValue(specularOpacityProp);
  const specularSaturation = useMotionValue(specularSaturationProp);
  const refractionBase = useMotionValue(refractionLevel);

  useEffect(() => {
    setCanRefract(supportsSvgBackdropFilter());
  }, []);

  useEffect(() => {
    if (checkedProp !== undefined) checked.set(checkedProp ? 1 : 0);
  }, [checkedProp, checked]);

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
    const onPointerUp = (e: MouseEvent | TouchEvent) => {
      if (pointerDown.get() < 0.5) return;
      pointerDown.set(0);
      const clientX =
        e instanceof MouseEvent ? e.clientX : e.changedTouches[0]?.clientX;
      if (clientX == null) return;
      if (Math.abs(clientX - initialPointerX.get()) > 4) {
        const next = xDragRatio.get() > 0.5;
        checked.set(next ? 1 : 0);
        onCheckedChange?.(next);
      }
    };
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [pointerDown, checked, xDragRatio, initialPointerX, onCheckedChange]);

  const active = useTransform(() => (pointerDown.get() > 0.5 ? 1 : 0));
  const xRatio = useSpring(
    useTransform(() => {
      if (pointerDown.get() > 0.5) return xDragRatio.get();
      return checked.get();
    }),
    { damping: 80, stiffness: 1000 },
  );
  const backgroundOpacity = useSpring(
    useTransform(active, (v) => 1 - 0.9 * v),
    { damping: 80, stiffness: 2000 },
  );
  const thumbScale = useSpring(
    useTransform(
      active,
      (v) => THUMB_REST_SCALE + (THUMB_ACTIVE_SCALE - THUMB_REST_SCALE) * v,
    ),
    { damping: 80, stiffness: 2000 },
  );
  const scaleRatio = useSpring(
    useTransform(() => (0.4 + 0.5 * active.get()) * refractionBase.get()),
  );
  const considerChecked = useTransform((): number => {
    if (pointerDown.get()) return xDragRatio.get() > 0.5 ? 1 : 0;
    return checked.get() > 0.5 ? 1 : 0;
  });
  const checkedSpring = useSpring(considerChecked, {
    damping: 80,
    stiffness: 1000,
  });
  const backgroundColor = useTransform(checkedSpring, (v: number) =>
    mix("#94949F77", "#3BBF4EEE")(v),
  );
  const thumbX = useTransform(() => xRatio.get() * TRAVEL);
  const thumbBg = useTransform(
    backgroundOpacity,
    (op) => `rgba(255, 255, 255, ${op})`,
  );

  function updateDrag(clientX: number) {
    const ratio = checked.get() + (clientX - initialPointerX.get()) / TRAVEL;
    const overflow = ratio < 0 ? -ratio : ratio > 1 ? ratio - 1 : 0;
    const overflowSign = ratio < 0 ? -1 : 1;
    xDragRatio.set(
      Math.min(1, Math.max(0, ratio)) + (overflowSign * overflow) / 22,
    );
  }

  return (
    <motion.div
      role="switch"
      aria-checked={
        checkedProp !== undefined ? checkedProp : defaultChecked
      }
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative inline-block cursor-pointer select-none touch-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      style={{
        width: sliderWidth,
        height: sliderHeight,
        backgroundColor,
        borderRadius: sliderHeight / 2,
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          const next = checked.get() < 0.5;
          checked.set(next ? 1 : 0);
          onCheckedChange?.(next);
        }
      }}
      onClick={(e) => {
        if (disabled) return;
        if (Math.abs(e.clientX - initialPointerX.get()) < 4) {
          const next = checked.get() < 0.5;
          checked.set(next ? 1 : 0);
          onCheckedChange?.(next);
        }
      }}
      onMouseMove={(e) => {
        if (pointerDown.get() < 0.5) return;
        updateDrag(e.clientX);
      }}
      onTouchMove={(e) => {
        if (pointerDown.get() < 0.5) return;
        const t = e.touches[0];
        if (t) updateDrag(t.clientX);
      }}
    >
      {canRefract ? (
        <LiquidGlassFilter
          id={filterId}
          width={thumbWidth}
          height={thumbHeight}
          radius={thumbRadius}
          bezelWidth={19}
          glassThickness={47}
          refractiveIndex={1.5}
          blur={blur}
          scaleRatio={scaleRatio}
          specularOpacity={specularOpacity}
          specularSaturation={specularSaturation}
          bezelHeightFn={LIP.fn}
        />
      ) : null}
      <motion.div
        className={cn("absolute", !canRefract && FROSTED_FALLBACK_CLASS)}
        onTouchStart={(e) => {
          if (disabled) return;
          const t = e.touches[0];
          if (!t) return;
          pointerDown.set(1);
          initialPointerX.set(t.clientX);
          xDragRatio.set(checked.get());
        }}
        onMouseDown={(e) => {
          if (disabled) return;
          pointerDown.set(1);
          initialPointerX.set(e.clientX);
          xDragRatio.set(checked.get());
        }}
        style={{
          height: thumbHeight,
          width: thumbWidth,
          marginLeft:
            -THUMB_REST_OFFSET +
            (sliderHeight - thumbHeight * THUMB_REST_SCALE) / 2,
          x: thumbX,
          y: "-50%",
          borderRadius: thumbRadius,
          top: sliderHeight / 2,
          backdropFilter: canRefract ? `url(#${filterId})` : undefined,
          WebkitBackdropFilter: canRefract ? `url(#${filterId})` : undefined,
          scale: thumbScale,
          backgroundColor: thumbBg,
          boxShadow: "0 4px 22px rgba(0,0,0,0.15)",
          transform: "translateZ(0)",
        }}
      />
    </motion.div>
  );
}
