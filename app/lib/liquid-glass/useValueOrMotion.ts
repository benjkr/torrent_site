import type { MotionValue } from "motion/react";

export function getValueOrMotion<T>(value: T | MotionValue<T>): T {
  return (
    value != null &&
    typeof value === "object" &&
    "get" in value &&
    typeof (value as MotionValue<T>).get === "function"
      ? (value as MotionValue<T>).get()
      : (value as T)
  );
}
