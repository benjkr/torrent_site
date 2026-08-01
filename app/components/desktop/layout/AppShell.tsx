import type { ReactNode } from "react";
import { Outlet } from "react-router";

import { DevBookmark } from "@/components/desktop/layout/DevBookmark";
import { StatusCorner } from "@/components/desktop/layout/StatusCorner";
import { TopNav } from "@/components/desktop/layout/TopNav";
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
      <main className="@container mx-auto max-w-7xl px-4 py-6">
        {children ?? <Outlet />}
      </main>
      <StatusCorner />
      {import.meta.env.DEV ? <DevBookmark /> : null}
    </>
  );
}
