import { useState } from "react";
import { BugIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TorrentFilesViewerStyle } from "@/components/TorrentFilesHoverCard";
import type {
  PiecePopupStyle,
  PieceStatusVariant,
} from "./PieceStatusBookmark";
import type { LibraryChromeView } from "./LibraryChrome";
import { cn } from "@/lib/utils";

export type LibraryCardView = "glass" | "legacy";
export type LibraryProgressColorMode = "cover" | "original";
export type LibraryProgressChrome = "frosted" | "flat";
export type LibraryCompleteAction = "logo" | "capsule";
export type LibrarySeedOffStyle = "red" | "muted";
export type LibraryPiecesVariant = PieceStatusVariant;
export type LibraryPiecesPopupStyle = PiecePopupStyle;

interface LibraryDebugPanelProps {
  chromeView: LibraryChromeView;
  onChromeViewChange: (v: LibraryChromeView) => void;
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
      <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
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
}: LibraryDebugPanelProps) {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "fixed bottom-4 right-4 z-[60] gap-1.5 shadow-lg",
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
              Dev-only. Production: Compact chrome, Original cards, Cover fill,
              Frosted actions, Seed logo, Red seed-off, Pieces field, Float popup.
            </p>

            <FlagGroup
              label="Filters chrome"
              value={chromeView}
              onChange={onChromeViewChange}
              options={[
                {
                  id: "compact",
                  label: "Compact",
                  hint: "Search-first glass bar with small filter pills.",
                },
                {
                  id: "legacy",
                  label: "Legacy",
                  hint: "Previous title + bordered filter chips + input.",
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
                  hint: "L1 frosted Seed circle beside ⋯.",
                },
                {
                  id: "capsule",
                  label: "Capsule",
                  hint: "Previous full-width Seed/Pause capsule.",
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
}
