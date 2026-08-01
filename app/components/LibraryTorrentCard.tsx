import { useEffect, useState } from "react";

import { LibraryTorrentCard as DesktopLibraryTorrentCard } from "@/components/desktop/library/LibraryTorrentCard";
import { LibraryTorrentCard as MobileLibraryTorrentCard } from "@/components/mobile/library/LibraryTorrentCard";
import type { LibraryTorrentCardProps } from "@/components/shared/library/torrentCardParts";
import { useMdUp } from "@/components/shared/ViewportGate";

export type { LibraryTorrentCardProps } from "@/components/shared/library/torrentCardParts";

export function LibraryTorrentCard(props: LibraryTorrentCardProps) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  useEffect(() => setReady(true), []);
  if (!ready || mdUp) return <DesktopLibraryTorrentCard {...props} />;
  return <MobileLibraryTorrentCard {...props} />;
}
