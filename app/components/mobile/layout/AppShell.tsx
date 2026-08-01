import type { ReactNode } from "react";
import { Outlet } from "react-router";

import { DevBookmark } from "@/components/mobile/layout/DevBookmark";
import { TopNav } from "@/components/mobile/layout/TopNav";
import { QbOfflineBanner } from "@/components/shared/QbOfflineBanner";

export function AppShell({
  disabled,
  children,
}: {
  disabled: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <TopNav disabled={disabled} />
      <QbOfflineBanner />
      <main className="@container mx-auto max-w-7xl px-4 py-6 pb-24">
        {children ?? <Outlet />}
      </main>
      {import.meta.env.DEV ? <DevBookmark /> : null}
    </>
  );
}
