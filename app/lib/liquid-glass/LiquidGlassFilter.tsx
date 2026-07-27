import { motion, type MotionValue, useTransform } from "motion/react";
import { useEffect, useState, type FC } from "react";
import {
  calculateDisplacementMap,
  calculateDisplacementMap2,
} from "@/lib/liquid-glass/displacementMap";
import { imageDataToUrl } from "@/lib/liquid-glass/imageData";
import { calculateMagnifyingDisplacementMap } from "@/lib/liquid-glass/magnifyingDisplacement";
import { calculateRefractionSpecular } from "@/lib/liquid-glass/specular";
import { CONVEX } from "@/lib/liquid-glass/surfaceEquations";
import { getValueOrMotion } from "@/lib/liquid-glass/useValueOrMotion";

export type LiquidGlassFilterProps = {
  id: string;
  withSvgWrapper?: boolean;
  scaleRatio?: number | MotionValue<number>;
  canvasWidth?: number | MotionValue<number>;
  canvasHeight?: number | MotionValue<number>;
  blur: number | MotionValue<number>;
  width: number | MotionValue<number>;
  height: number | MotionValue<number>;
  radius: number | MotionValue<number>;
  glassThickness: number | MotionValue<number>;
  bezelWidth: number | MotionValue<number>;
  refractiveIndex: number | MotionValue<number>;
  specularOpacity: number | MotionValue<number>;
  specularSaturation?: number | MotionValue<number>;
  magnifyingScale?: number | MotionValue<number>;
  colorScheme?: "light" | "dark" | MotionValue<"light" | "dark">;
  dpr?: number;
  bezelHeightFn?: (x: number) => number;
};

/**
 * SVG filter that applies liquid-glass refraction + specular highlight.
 * Client-only: map generation needs DOM canvas APIs.
 */
export const LiquidGlassFilter: FC<LiquidGlassFilterProps> = ({
  id,
  withSvgWrapper = true,
  canvasWidth,
  canvasHeight,
  width,
  height,
  radius,
  blur,
  glassThickness,
  bezelWidth,
  refractiveIndex,
  scaleRatio,
  specularOpacity,
  specularSaturation = 4,
  magnifyingScale,
  colorScheme,
  bezelHeightFn = CONVEX.fn,
  dpr,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const map = useTransform(() =>
    calculateDisplacementMap(
      getValueOrMotion(glassThickness),
      getValueOrMotion(bezelWidth),
      bezelHeightFn,
      getValueOrMotion(refractiveIndex),
    ),
  );

  const maximumDisplacement = useTransform(() => {
    const values = map.get();
    if (!values.length) return 1;
    return Math.max(...values.map((v) => Math.abs(v)), 1);
  });

  const displacementMap = useTransform(() =>
    calculateDisplacementMap2(
      getValueOrMotion(canvasWidth ?? width),
      getValueOrMotion(canvasHeight ?? height),
      getValueOrMotion(width),
      getValueOrMotion(height),
      getValueOrMotion(radius),
      getValueOrMotion(bezelWidth),
      getValueOrMotion(maximumDisplacement),
      getValueOrMotion(map),
      dpr,
    ),
  );

  const specularLayer = useTransform(() =>
    calculateRefractionSpecular(
      getValueOrMotion(width),
      getValueOrMotion(height),
      getValueOrMotion(radius),
      50,
      undefined,
      dpr,
    ),
  );

  const magnifyingDisplacementMap = useTransform(() =>
    magnifyingScale !== undefined
      ? calculateMagnifyingDisplacementMap(
          getValueOrMotion(canvasWidth ?? width),
          getValueOrMotion(canvasHeight ?? height),
          dpr,
        )
      : undefined,
  );

  const magnifyingDisplacementMapDataUrl = useTransform(() => {
    if (magnifyingScale === undefined) return "";
    const data = magnifyingDisplacementMap.get();
    return data ? imageDataToUrl(data) : "";
  });

  const displacementMapDataUrl = useTransform(() =>
    imageDataToUrl(displacementMap.get()),
  );

  const specularLayerDataUrl = useTransform(() =>
    imageDataToUrl(specularLayer.get()),
  );

  const scale = useTransform(
    () =>
      maximumDisplacement.get() *
      (scaleRatio !== undefined ? getValueOrMotion(scaleRatio) : 1),
  );

  const colorMatrixValues = useTransform(() => {
    if (colorScheme === undefined) return "";
    return getValueOrMotion(colorScheme) === "dark"
      ? "0.9 0 0 0 -0.3 0 0.9 0 0 -0.3 0 0 0.9 0 -0.3 0 0 0 1 0"
      : "1.03 0 0 0 0.2 0 1.03 0 0 0.2 0 0 1.03 0 0.2 0 0 0 1 0";
  });

  const saturateValues = useTransform(() =>
    getValueOrMotion(specularSaturation).toString(),
  );

  const specularSlope = useTransform(() => getValueOrMotion(specularOpacity));

  if (!mounted) return null;

  const hasMagnify = magnifyingScale !== undefined;
  const hasColorScheme = colorScheme !== undefined;

  const blurInput = hasColorScheme
    ? "brightened_source"
    : hasMagnify
      ? "magnified_source"
      : "SourceGraphic";

  const mapWidth = canvasWidth ?? width;
  const mapHeight = canvasHeight ?? height;

  const content = (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      {hasMagnify ? (
        <>
          <motion.feImage
            href={magnifyingDisplacementMapDataUrl}
            x={0}
            y={0}
            width={mapWidth}
            height={mapHeight}
            result="magnifying_displacement_map"
          />
          <motion.feDisplacementMap
            in="SourceGraphic"
            in2="magnifying_displacement_map"
            scale={magnifyingScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="magnified_source"
          />
        </>
      ) : null}

      {hasColorScheme ? (
        <motion.feColorMatrix
          in={hasMagnify ? "magnified_source" : "SourceGraphic"}
          type="matrix"
          values={colorMatrixValues as never}
          result="brightened_source"
        />
      ) : null}

      <motion.feGaussianBlur
        in={blurInput}
        stdDeviation={blur}
        result="blurred_source"
      />

      <motion.feImage
        href={displacementMapDataUrl}
        x={0}
        y={0}
        width={mapWidth}
        height={mapHeight}
        result="displacement_map"
      />

      <motion.feDisplacementMap
        in="blurred_source"
        in2="displacement_map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />

      <motion.feColorMatrix
        in="displaced"
        type="saturate"
        values={saturateValues as never}
        result="displaced_saturated"
      />

      <motion.feImage
        href={specularLayerDataUrl}
        x={0}
        y={0}
        width={mapWidth}
        height={mapHeight}
        result="specular_layer"
      />

      <feComposite
        in="displaced_saturated"
        in2="specular_layer"
        operator="in"
        result="specular_saturated"
      />

      <feComponentTransfer in="specular_layer" result="specular_faded">
        <motion.feFuncA
          type="linear"
          slope={specularSlope as unknown as number}
        />
      </feComponentTransfer>

      <motion.feBlend
        in="specular_saturated"
        in2="displaced"
        mode="normal"
        result="withSaturation"
      />
      <motion.feBlend in="specular_faded" in2="withSaturation" mode="normal" />
    </filter>
  );

  return withSvgWrapper ? (
    <svg
      colorInterpolationFilters="sRGB"
      aria-hidden
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
      }}
    >
      <defs>{content}</defs>
    </svg>
  ) : (
    content
  );
};
