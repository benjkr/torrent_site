import PieceStatusBookmark, {
  type PiecePopupStyle,
  type PieceStatusVariant,
} from "@/components/shared/PieceStatusBookmark";
import { MobileMetaBand } from "@/components/mobile/library/MobileMetaBand";
import {
  ActionRow,
  Cover,
  StatusChips,
  TitleBlock,
  TransferSpeed,
  buildModel,
  glassShell,
  type LibraryTorrentCardProps,
} from "@/components/shared/library/torrentCardParts";
import { useDominantColor } from "@/lib/dominant-color";
import { cn } from "@/lib/utils";

/** Mobile: Meta band D — floating poster, no files/pieces. */
export function LibraryTorrentCard(props: LibraryTorrentCardProps) {
  const model = buildModel(props);
  const legacy = (props.variant ?? "legacy") === "legacy";
  const progressColorMode = props.progressColorMode ?? "cover";
  const progressChrome = props.progressChrome ?? "frosted";
  const completeAction = props.completeAction ?? "logo";
  const seedOffStyle = props.seedOffStyle ?? "red";
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
        "group/card relative overflow-hidden transition-[box-shadow,background-color,border-color]",
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
      <div className="flex flex-col">
        <div className="relative flex gap-2.5 p-3 pb-2">
          {bookmark}
          <Cover model={model} float className="w-[4.25rem] self-start" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <TitleBlock
              model={model}
              padForBookmark={piecesVariant === "bookmark"}
            />
            <StatusChips model={model} glass={!legacy} />
            <TransferSpeed
              dlspeed={model.torrent.dlspeed || 0}
              upspeed={model.torrent.upspeed || 0}
              complete={model.complete}
              formatBytes={model.formatBytes}
            />
          </div>
        </div>
        <MobileMetaBand model={model} />
        <div className="px-3 pb-3">
          <ActionRow
            model={model}
            dominantColor={dominantColor}
            progressColorMode={progressColorMode}
            progressChrome={progressChrome}
            completeAction={completeAction}
            seedOffStyle={seedOffStyle}
          />
        </div>
      </div>
    </div>
  );
}
