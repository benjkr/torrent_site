import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BugIcon, XIcon } from "lucide-react";

import { useForceMobile } from "@/components/shared/ForceMobileToggle";
import { Button } from "@/components/ui/button";
import type { TorrentFilesViewerStyle } from "@/components/TorrentFilesHoverCard";
import type {
  PiecePopupStyle,
  PieceStatusVariant,
} from "./PieceStatusBookmark";
import type {
  LibraryChromeDensity,
  LibraryChromeView,
} from "@/components/shared/library/chrome";
import type { LibrarySimScenario } from "@/lib/library-sim-torrent";
import { cn } from "@/lib/utils";

export type LibraryCardView = "glass" | "legacy";
export type LibraryProgressColorMode = "cover" | "original";
export type LibraryProgressChrome = "frosted" | "flat";
export type LibraryCompleteAction = "logo" | "capsule";
export type LibrarySeedOffStyle = "red" | "muted";
export type LibraryPiecesVariant = PieceStatusVariant;
export type LibraryPiecesPopupStyle = PiecePopupStyle;
export type { LibrarySimScenario };

interface LibraryDebugPanelProps {
  chromeView: LibraryChromeView;
  onChromeViewChange: (v: LibraryChromeView) => void;
  chromeDensity: LibraryChromeDensity;
  onChromeDensityChange: (v: LibraryChromeDensity) => void;
  cardView: LibraryCardView;
  onCardViewChange: (v: LibraryCardView) => void;
  progressColorMode: LibraryProgressColorMode;
  onProgressColorModeChange: (v: LibraryProgressColorMode) => void;
  progressChrome: LibraryProgressChrome;
  onProgressChromeChange: (v: LibraryProgressChrome) => void;
  completeAction: LibraryCompleteAction;
  onCompleteActionChange: (v: LibraryCompleteAction) => void;
  seedOffStyle: LibrarySeedOffStyle;
  onSeedOffStyleChange: (v: LibrarySeedOffStyle) => void;
  filesViewerStyle: TorrentFilesViewerStyle;
  onFilesViewerStyleChange: (v: TorrentFilesViewerStyle) => void;
  piecesVariant: LibraryPiecesVariant;
  onPiecesVariantChange: (v: LibraryPiecesVariant) => void;
  piecesPopupStyle: LibraryPiecesPopupStyle;
  onPiecesPopupStyleChange: (v: LibraryPiecesPopupStyle) => void;
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
  chromeView,
  onChromeViewChange,
  chromeDensity,
  onChromeDensityChange,
  cardView,
  onCardViewChange,
  progressColorMode,
  onProgressColorModeChange,
  progressChrome,
  onProgressChromeChange,
  completeAction,
  onCompleteActionChange,
  seedOffStyle,
  onSeedOffStyleChange,
  filesViewerStyle,
  onFilesViewerStyleChange,
  piecesVariant,
  onPiecesVariantChange,
  piecesPopupStyle,
  onPiecesPopupStyleChange,
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
              Dev-only. Production: Sim off, Compact chrome, Tight density,
              Original cards, Cover fill, Frosted actions, Seed logo, Red
              seed-off, Pieces field, Float popup.
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

            <FlagGroup
              label="Filters chrome"
              value={chromeView}
              onChange={onChromeViewChange}
              options={[
                {
                  id: "compact",
                  label: "Compact",
                  hint: "Search-first glass bar with status filter menu.",
                },
                {
                  id: "legacy",
                  label: "Legacy",
                  hint: "Previous title + bordered filter chips + input.",
                },
              ]}
            />

            <FlagGroup
              label="Header density"
              value={chromeDensity}
              onChange={onChromeDensityChange}
              options={[
                {
                  id: "tight",
                  label: "Tight",
                  hint: "Less vertical margin between title, search, and cards.",
                },
                {
                  id: "roomy",
                  label: "Roomy",
                  hint: "Previous larger gaps between header elements and cards.",
                },
              ]}
            />

            <FlagGroup
              label="Card chrome"
              value={cardView}
              onChange={onCardViewChange}
              options={[
                {
                  id: "legacy",
                  label: "Original",
                  hint: "Default dark card with emerald completed tint.",
                },
                {
                  id: "glass",
                  label: "Glass",
                  hint: "Frosted Soft Island card (A1).",
                },
              ]}
            />

            <FlagGroup
              label="Action chrome"
              value={progressChrome}
              onChange={onProgressChromeChange}
              options={[
                {
                  id: "frosted",
                  label: "Frosted",
                  hint: "G1 glass on progress, Seed logo, ⋯, and menu.",
                },
                {
                  id: "flat",
                  label: "Flat",
                  hint: "Previous non-glass action controls.",
                },
              ]}
            />

            <FlagGroup
              label="Complete action"
              value={completeAction}
              onChange={onCompleteActionChange}
              options={[
                {
                  id: "logo",
                  label: "Logo",
                  hint: "Frosted Seed circle beside ⋯.",
                },
                {
                  id: "capsule",
                  label: "Capsule",
                  hint: "Full-width Seed/Pause capsule.",
                },
              ]}
            />

            <FlagGroup
              label="Seed off"
              value={seedOffStyle}
              onChange={onSeedOffStyleChange}
              options={[
                {
                  id: "red",
                  label: "Red",
                  hint: "R3 red sprout + soft red tint when seeding is off.",
                },
                {
                  id: "muted",
                  label: "Muted",
                  hint: "Previous muted seed-off (no red).",
                },
              ]}
            />

            <FlagGroup
              label="File viewer"
              value={filesViewerStyle}
              onChange={onFilesViewerStyleChange}
              options={[
                {
                  id: "dense-glass",
                  label: "Dense glass",
                  hint: "A2 frosted dense file list (production default).",
                },
                {
                  id: "legacy",
                  label: "Legacy",
                  hint: "Previous flat popover file list.",
                },
              ]}
            />

            <FlagGroup
              label="Pieces"
              value={piecesVariant}
              onChange={onPiecesVariantChange}
              options={[
                {
                  id: "field",
                  label: "Field",
                  hint: "Stats cell under Files (production default).",
                },
                {
                  id: "bookmark",
                  label: "Bookmark",
                  hint: "Previous top-right ribbon bookmark.",
                },
              ]}
            />

            <FlagGroup
              label="Pieces popup"
              value={piecesPopupStyle}
              onChange={onPiecesPopupStyleChange}
              options={[
                {
                  id: "float",
                  label: "Float",
                  hint: "Dense-glass Ring·Line: floating mosaic, no ring/percent.",
                },
                {
                  id: "legacy",
                  label: "Legacy",
                  hint: "Previous popover with legend, progress bar, and framed map.",
                },
              ]}
            />

            <FlagGroup
              label="Progress fill"
              value={progressColorMode}
              onChange={onProgressColorModeChange}
              options={[
                {
                  id: "cover",
                  label: "Cover",
                  hint: "P1 soft wash from the poster’s dominant color.",
                },
                {
                  id: "original",
                  label: "Original",
                  hint: "Previous fixed sky / emerald progress fills.",
                },
              ]}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  return createPortal(ui, document.body);
}
