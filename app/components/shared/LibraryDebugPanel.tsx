import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BugIcon, XIcon } from "lucide-react";

import { useForceMobile } from "@/components/shared/ForceMobileToggle";
import { Button } from "@/components/ui/button";
import type { LibrarySimScenario } from "@/lib/library-sim-torrent";
import { cn } from "@/lib/utils";

export type { LibrarySimScenario };

interface LibraryDebugPanelProps {
  simScenario: LibrarySimScenario;
  onSimScenarioChange: (v: LibrarySimScenario) => void;
  simProgressColor: string;
  onSimProgressColorChange: (v: string) => void;
}

function FlagGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; hint: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <section className="flex items-center justify-between gap-3">
      <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className="inline-flex max-w-[min(100%,18rem)] flex-wrap justify-end rounded-md border border-border/60 bg-muted/30 p-0.5">
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.hint}
              onClick={() => onChange(opt.id)}
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
  );
}

export default function LibraryDebugPanel({
  simScenario,
  onSimScenarioChange,
  simProgressColor,
  onSimProgressColorChange,
}: LibraryDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const forceMobile = useForceMobile();

  useEffect(() => setMounted(true), []);

  if (!import.meta.env.DEV || !mounted) return null;

  const ui = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "fixed right-4 z-[70] gap-1.5 shadow-lg",
          forceMobile ? "bottom-4" : "bottom-24 md:bottom-4",
          open && "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <BugIcon className="size-3.5" />
        Debug
      </Button>

      {open ? (
        <div
          className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
          role="dialog"
          aria-label="Library debug"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <BugIcon className="size-4 text-muted-foreground" />
              Library debug
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <XIcon />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
            <p className="text-[0.625rem] text-muted-foreground">
              Dev-only simulator torrent card.
            </p>

            <FlagGroup
              label="Sim card"
              value={simScenario}
              onChange={onSimScenarioChange}
              options={[
                {
                  id: "off",
                  label: "Off",
                  hint: "Hide the fake simulator torrent card.",
                },
                {
                  id: "downloading",
                  label: "Down",
                  hint: "Fake downloading card with animated progress + sparkles.",
                },
                {
                  id: "paused",
                  label: "Pause",
                  hint: "Fake mid-download paused card.",
                },
                {
                  id: "stalled",
                  label: "Stall",
                  hint: "Fake stalled download card.",
                },
                {
                  id: "queued",
                  label: "Queue",
                  hint: "Fake queued download card.",
                },
                {
                  id: "seeding",
                  label: "Seed",
                  hint: "Fake complete seeding card with upload sparkles.",
                },
                {
                  id: "finished",
                  label: "Done",
                  hint: "Fake finished (paused after complete) card.",
                },
                {
                  id: "error",
                  label: "Error",
                  hint: "Fake error-state card.",
                },
              ]}
            />

            {simScenario !== "off" ? (
              <section className="flex items-center justify-between gap-3">
                <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sim progress color
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={simProgressColor}
                    onChange={(e) => onSimProgressColorChange(e.target.value)}
                    title="Progress fill + sparkle color for the sim card"
                    className="size-7 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={simProgressColor}
                    onChange={(e) => {
                      let v = e.target.value.trim();
                      if (!v.startsWith("#")) v = `#${v}`;
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                        onSimProgressColorChange(v.toLowerCase());
                      }
                    }}
                    spellCheck={false}
                    className="w-[5.5rem] rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[0.625rem] text-foreground"
                    aria-label="Sim progress color hex"
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  return createPortal(ui, document.body);
}
