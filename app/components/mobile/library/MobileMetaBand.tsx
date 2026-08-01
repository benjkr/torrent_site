import {
  PeersField,
  type CardModel,
} from "@/components/shared/library/torrentCardParts";
import { cn } from "@/lib/utils";

/** Mobile meta band: ETA · size · peers (no files/pieces). */
export function MobileMetaBand({ model }: { model: CardModel }) {
  const { torrent: t, eta, complete, formatBytes } = model;
  return (
    <div
      className={cn(
        "mx-3 mb-1.5 flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5",
        "bg-black/25 text-[0.625rem] text-white/50 ring-1 ring-white/10",
      )}
    >
      <span
        className="min-w-0 truncate"
        title={complete ? undefined : eta || undefined}
      >
        {complete ? "Done" : `ETA ${eta || "—"}`}
      </span>
      <span
        className="shrink-0 tabular-nums text-white/40"
        title={formatBytes(t.size || 0)}
      >
        {formatBytes(t.size || 0)}
      </span>
      <PeersField torrent={t} />
    </div>
  );
}
