import { LiquidGlassControlsForm } from "@/components/LiquidGlassControlsForm";

/**
 * DEV-only floating/popup window host for liquid-glass sliders.
 * Opened from the main app so the Library page stays fully visible.
 */
export default function DebugLiquidGlassControlsPage() {
  return <LiquidGlassControlsForm />;
}
