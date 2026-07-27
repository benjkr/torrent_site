import { useState } from "react";
import { DropletsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LIQUID_GLASS_BEZEL_OPTIONS,
  LIQUID_GLASS_PARAM_META,
} from "@/lib/liquid-glass/config";
import { useLiquidGlassConfig } from "@/lib/liquid-glass/LiquidGlassConfigContext";
import type { BezelType } from "@/lib/liquid-glass/surfaceEquations";
import { cn } from "@/lib/utils";

/** Shared slider UI for the floating controls window. */
export function LiquidGlassControlsForm() {
  const { config, dirty, setParam, resetToSaved, saveToRepo, saving } =
    useLiquidGlassConfig();
  const [status, setStatus] = useState<string | null>(null);

  const onSave = async () => {
    setStatus(null);
    const result = await saveToRepo();
    if (result.ok) {
      setStatus("Saved to liquid-glass.config.json — commit when ready.");
    } else {
      setStatus(result.error);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-card text-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <DropletsIcon className="size-4 text-muted-foreground" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">Liquid glass</h1>
          <p className="text-[0.5625rem] text-muted-foreground">
            Live sync to the main window · Save writes the repo file
          </p>
        </div>
        {dirty ? (
          <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[0.5625rem] font-medium text-amber-100">
            Unsaved
          </span>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        <p className="text-[0.625rem] text-muted-foreground">
          Tweaks apply instantly on Library / showcase. Save writes{" "}
          <code className="text-foreground/80">
            app/lib/liquid-glass/liquid-glass.config.json
          </code>
          .
        </p>

        <section className="space-y-1.5">
          <h2 className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Bezel
          </h2>
          <div className="inline-flex flex-wrap rounded-md border border-border/60 bg-muted/30 p-0.5">
            {LIQUID_GLASS_BEZEL_OPTIONS.map((opt) => {
              const on = config.bezelType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setParam("bezelType", opt.id as BezelType)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                    on
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {LIQUID_GLASS_PARAM_META.map((param) => (
          <label
            key={param.key}
            className="flex items-center gap-2 text-[0.625rem] text-foreground/85"
          >
            <span className="w-28 shrink-0 text-muted-foreground">
              {param.label}
            </span>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={config[param.key]}
              onChange={(e) =>
                setParam(param.key, parseFloat(e.currentTarget.value))
              }
              className="min-w-0 flex-1 accent-foreground"
            />
            <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
              {Number(config[param.key]).toFixed(param.step < 1 ? 2 : 0)}
            </span>
          </label>
        ))}

        {status ? (
          <p
            className={cn(
              "text-[0.625rem]",
              status.startsWith("Saved") ? "text-emerald-400" : "text-red-400",
            )}
          >
            {status}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[0.625rem]"
          disabled={!dirty || saving}
          onClick={() => {
            resetToSaved();
            setStatus(null);
          }}
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto text-[0.625rem]"
          disabled={!dirty || saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save to repo"}
        </Button>
      </footer>
    </div>
  );
}
