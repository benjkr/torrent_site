import { useEffect, useState } from "react";

import DesktopSearchBar from "@/components/desktop/search/SearchBar";
import MobileSearchBar from "@/components/mobile/search/SearchBar";
import type { SearchBarProps } from "@/components/shared/search/searchBarShared";
import { useMdUp } from "@/components/shared/ViewportGate";

export type { SearchBarProps } from "@/components/shared/search/searchBarShared";

export default function SearchBar(props: SearchBarProps) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  useEffect(() => setReady(true), []);
  if (!ready || mdUp) return <DesktopSearchBar {...props} />;
  return <MobileSearchBar {...props} />;
}
