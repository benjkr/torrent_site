import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ForceMobilePhoneFrame,
  useForceMobile,
} from "@/components/shared/ForceMobileToggle";

const MD_QUERY = "(min-width: 768px)";

/** True from `md` (768px) up, unless DEV force-mobile is on. */
export function useMdUp() {
  const [mdUp, setMdUp] = useState(false);
  const forceMobile = useForceMobile();

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const sync = () => setMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (forceMobile) return false;
  return mdUp;
}

/** Boundary-only: visible below `md`. Do not use md: breakpoints inside platform files. */
export function MobileOnly({ children }: { children: ReactNode }) {
  return <div className="contents md:hidden">{children}</div>;
}

/** Boundary-only: visible from `md` up. Do not use md: breakpoints inside platform files. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden md:contents">{children}</div>;
}

/**
 * Mount exactly one platform tree (avoids dual `<Outlet />`).
 * Until matchMedia is ready, mounts desktop (historical default).
 * DEV force-mobile mounts the mobile tree inside a phone-sized frame.
 */
export function PlatformRoot({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const mdUp = useMdUp();
  const forceMobile = useForceMobile();

  useEffect(() => {
    setReady(true);
  }, []);

  if (forceMobile) {
    return <ForceMobilePhoneFrame>{mobile}</ForceMobilePhoneFrame>;
  }
  if (!ready) return <>{desktop}</>;
  return mdUp ? <>{desktop}</> : <>{mobile}</>;
}
