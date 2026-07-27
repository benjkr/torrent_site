import { useState, type ReactNode } from "react";
import {
  LiquidCard,
  LiquidMagnifier,
  LiquidSearch,
  LiquidSlider,
  LiquidSwitch,
} from "@/components/liquid-glass";
import { useLiquidGlassConfig } from "@/lib/liquid-glass/LiquidGlassConfigContext";

/**
 * DEV showcase for liquid-glass kit (kube.io SVG refraction).
 * Optics come from the global Liquid panel / liquid-glass.config.json.
 */
export default function DebugLiquidGlassPage() {
  const { config } = useLiquidGlassConfig();
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(42);

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        className="relative min-h-[calc(100vh-4rem)] px-4 py-8 text-white"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)," +
            'url("https://images.unsplash.com/photo-1497250681960-ef046c08a56e?q=80&w=1600&auto=format&fit=crop")',
          backgroundSize: "28px 28px, 28px 28px, cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay, overlay, normal",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <header className="space-y-2">
            <p className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
              Debug · Liquid Glass
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Component kit
            </h1>
            <p className="max-w-xl text-sm text-white/70">
              Uses the global Liquid panel (bottom-left) and{" "}
              <code className="text-white/90">liquid-glass.config.json</code>.
              Full refraction needs Chromium.
            </p>
            <p className="font-mono text-[0.625rem] tabular-nums text-white/45">
              bezel {config.bezelWidth} · thick {config.glassThickness} · n{" "}
              {config.refractiveIndex.toFixed(2)} · refr{" "}
              {config.refractionLevel.toFixed(2)} · blur {config.blur.toFixed(1)}
            </p>
          </header>

          <DemoBlock title="LiquidSearch">
            <LiquidSearch
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search torrents…"
            />
            {query ? (
              <p className="mt-2 text-xs text-white/50">Query: {query}</p>
            ) : null}
          </DemoBlock>

          <DemoBlock title="LiquidSwitch">
            <div className="flex items-center gap-4">
              <LiquidSwitch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-sm text-white/80">
                {enabled ? "On" : "Off"}
              </span>
            </div>
          </DemoBlock>

          <DemoBlock title="LiquidSlider">
            <LiquidSlider value={level} onValueChange={setLevel} />
            <p className="mt-2 text-xs tabular-nums text-white/50">
              {Math.round(level)}
            </p>
          </DemoBlock>

          <DemoBlock title="LiquidCard">
            <LiquidCard className="max-w-md">
              <p className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
                Now playing
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">
                Liquid Glass Panel
              </p>
              <p className="mt-1 text-xs text-white/55">
                Drop any chrome or content inside. Edges refract the scene behind
                the card.
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-2/5 rounded-full bg-white/50" />
              </div>
            </LiquidCard>
          </DemoBlock>

          <DemoBlock title="LiquidMagnifier">
            <LiquidMagnifier className="min-h-[320px]" blur={0}>
              <p className="text-[0.5625rem] font-medium uppercase tracking-wide text-emerald-400/80">
                Optics
              </p>
              <h3 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-white">
                Drag the lens
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
                The capsule uses a stronger center magnification map plus the
                bezel refraction field. High-contrast edges make the bend
                obvious.
              </p>
            </LiquidMagnifier>
          </DemoBlock>
        </div>
      </div>
    </div>
  );
}

function DemoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/50">
        {title}
      </h2>
      {children}
    </section>
  );
}
