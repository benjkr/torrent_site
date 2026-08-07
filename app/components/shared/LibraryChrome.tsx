import { useEffect, useState } from "react";

import { LibraryChrome as DesktopLibraryChrome } from "@/components/desktop/library/LibraryChrome";
import { LibraryChrome as MobileLibraryChrome } from "@/components/mobile/library/LibraryChrome";
import {
  type LibraryChromeProps,
} from "@/components/shared/library/chrome";
import { useMdUp } from "@/components/shared/ViewportGate";

export type {
  LibraryFilterId,
  LibraryChromeProps,
} from "@/components/shared/library/chrome";
export { LIBRARY_FILTERS } from "@/components/shared/library/chrome";

export function LibraryChrome(props: LibraryChromeProps) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  useEffect(() => setReady(true), []);

  if (!ready || mdUp) return <DesktopLibraryChrome {...props} />;
  return <MobileLibraryChrome {...props} />;
}
