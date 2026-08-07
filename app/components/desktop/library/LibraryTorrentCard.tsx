import {
  ActionRow,
  Cover,
  StatsGrid,
  StatusChips,
  TitleBlock,
  buildModel,
  type LibraryTorrentCardProps,
} from "@/components/shared/library/torrentCardParts";
import { useDominantColor } from "@/lib/dominant-color";
import { cn } from "@/lib/utils";

/** Desktop: flush cover strip + full StatsGrid (files/pieces). */
export function LibraryTorrentCard(props: LibraryTorrentCardProps) {
  const model = buildModel(props);
  const progressColorOverride = import.meta.env.DEV
    ? (props.progressColorOverride ?? null)
    : null;
  const dominantColor = useDominantColor(model.meta?.image);

  return (
    <div
      className={cn(
        "group/card relative flex overflow-hidden rounded-2xl border ring-1 ring-inset ring-white/5 transition-[box-shadow,background-color,border-color]",
        "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5),inset_0_4px_12px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)]",
        model.complete
          ? "border-emerald-500/35 bg-emerald-950/55 dark:bg-emerald-950/70"
          : "border-black/40 bg-black/14 dark:bg-black/25",
      )}
      onMouseEnter={props.onMouseEnter}
    >
      <Cover model={model} />
      <div className="relative flex min-w-0 flex-1 flex-col p-3 pl-3">
        <TitleBlock model={model} />
        <StatusChips model={model} />
        <StatsGrid model={model} />
        <ActionRow
          model={model}
          className="mt-auto"
          dominantColor={dominantColor}
          progressColorOverride={progressColorOverride}
        />
      </div>
    </div>
  );
}
