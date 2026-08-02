import PieceStatusBookmark, {
  type PiecePopupStyle,
  type PieceStatusVariant,
} from "@/components/shared/PieceStatusBookmark";
import {
  ActionRow,
  Cover,
  StatsGrid,
  StatusChips,
  TitleBlock,
  buildModel,
  glassShell,
  type LibraryTorrentCardProps,
} from "@/components/shared/library/torrentCardParts";
import { useDominantColor } from "@/lib/dominant-color";
import { cn } from "@/lib/utils";

/** Desktop: flush cover strip + full StatsGrid (files/pieces). */
export function LibraryTorrentCard(props: LibraryTorrentCardProps) {
  const model = buildModel(props);
  const legacy = (props.variant ?? "legacy") === "legacy";
  const progressColorMode = props.progressColorMode ?? "cover";
  const progressChrome = props.progressChrome ?? "frosted";
  const completeAction = props.completeAction ?? "logo";
  const seedOffStyle = props.seedOffStyle ?? "red";
  const filesViewerStyle = props.filesViewerStyle ?? "dense-glass";
  const progressColorOverride = import.meta.env.DEV
    ? (props.progressColorOverride ?? null)
    : null;
  const piecesVariant: PieceStatusVariant = import.meta.env.DEV
    ? (props.piecesVariant ?? "field")
    : "field";
  const piecesPopupStyle: PiecePopupStyle = import.meta.env.DEV
    ? (props.piecesPopupStyle ?? "float")
    : "float";
  const dominantColor = useDominantColor(model.meta?.image);

  const bookmark =
    piecesVariant === "bookmark" ? (
      <div className="pointer-events-auto absolute top-0 right-2.5 z-10 -translate-y-px">
        <PieceStatusBookmark
          hash={model.torrent.hash}
          variant="bookmark"
          popupStyle={piecesPopupStyle}
        />
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "group/card relative flex overflow-hidden transition-[box-shadow,background-color,border-color]",
        legacy
          ? cn(
              "rounded-2xl border ring-1 ring-inset ring-white/5",
              "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5),inset_0_4px_12px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)]",
              model.complete
                ? "border-emerald-500/35 bg-emerald-950/55 dark:bg-emerald-950/70"
                : "border-black/40 bg-black/14 dark:bg-black/25",
            )
          : cn(glassShell, "rounded-[1.5rem]"),
      )}
      onMouseEnter={props.onMouseEnter}
    >
      <Cover model={model} />
      <div className="relative flex min-w-0 flex-1 flex-col p-3 pl-3">
        {bookmark}
        <TitleBlock
          model={model}
          padForBookmark={piecesVariant === "bookmark"}
        />
        <StatusChips model={model} glass={!legacy} />
        <StatsGrid
          model={model}
          filesViewerStyle={filesViewerStyle}
          piecesVariant={piecesVariant}
          piecesPopupStyle={piecesPopupStyle}
        />
        <ActionRow
          model={model}
          className="mt-auto"
          dominantColor={dominantColor}
          progressColorMode={progressColorMode}
          progressChrome={progressChrome}
          completeAction={completeAction}
          seedOffStyle={seedOffStyle}
          progressColorOverride={progressColorOverride}
        />
      </div>
    </div>
  );
}
