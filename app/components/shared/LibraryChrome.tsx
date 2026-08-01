import { useEffect, useState } from "react";

import { LibraryChrome as DesktopLibraryChrome } from "@/components/desktop/library/LibraryChrome";
import { LibraryChrome as MobileLibraryChrome } from "@/components/mobile/library/LibraryChrome";
import { LibraryChromeLegacy } from "@/components/shared/library/LibraryChromeLegacy";
import {
  type LibraryChromeDensity,
  type LibraryChromeProps,
  type LibraryChromeView,
} from "@/components/shared/library/chrome";
import { useMdUp } from "@/components/shared/ViewportGate";

export type {
  LibraryChromeDensity,
  LibraryChromeView,
  LibraryFilterId,
  LibraryChromeProps,
} from "@/components/shared/library/chrome";
export { LIBRARY_FILTERS } from "@/components/shared/library/chrome";

export function LibraryChrome({
  view,
  density = "tight",
  ...props
}: LibraryChromeProps & {
  view: LibraryChromeView;
  density?: LibraryChromeDensity;
}) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  useEffect(() => setReady(true), []);

  if (view === "legacy") return <LibraryChromeLegacy {...props} />;
  if (!ready || mdUp) return <DesktopLibraryChrome density={density} {...props} />;
  return <MobileLibraryChrome {...props} />;
}
