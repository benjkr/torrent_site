import { useEffect, useState } from "react";

import { LibraryTorrentCard as DesktopLibraryTorrentCard } from "@/components/desktop/library/LibraryTorrentCard";
import { LibraryShelfCard } from "@/components/desktop/library/LibraryShelfCard";
import { LibraryTorrentCard as MobileLibraryTorrentCard } from "@/components/mobile/library/LibraryTorrentCard";
import type { LibraryTorrentCardProps } from "@/components/shared/library/torrentCardParts";
import { useMdUp } from "@/components/shared/ViewportGate";

export type { LibraryTorrentCardProps } from "@/components/shared/library/torrentCardParts";

/** Desktop card layout. Production always uses shelf; legacy only via DEV Debug. */
export type LibraryCardLayout = "shelf" | "legacy";

export function LibraryTorrentCard(
  props: LibraryTorrentCardProps & { layout?: LibraryCardLayout },
) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  useEffect(() => setReady(true), []);

  const layout: LibraryCardLayout =
    import.meta.env.DEV && props.layout === "legacy" ? "legacy" : "shelf";

  if (!ready || mdUp) {
    if (layout === "shelf") return <LibraryShelfCard {...props} />;
    return <DesktopLibraryTorrentCard {...props} />;
  }
  return <MobileLibraryTorrentCard {...props} />;
}
