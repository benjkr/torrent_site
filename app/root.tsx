import { type ReactNode } from "react";
import type { LinksFunction } from "react-router";
import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./index.css";
import { AppShell as DesktopAppShell } from "@/components/desktop/layout/AppShell";
import { AppShell as MobileAppShell } from "@/components/mobile/layout/AppShell";
import { DebugPagesNav } from "@/components/shared/DebugPagesNav";
import { ForceMobileToggle } from "@/components/shared/ForceMobileToggle";
import { PlatformRoot } from "@/components/shared/ViewportGate";
import { MaindataProvider } from "./lib/maindata";
import { QbDebugProvider } from "./lib/qb-debug";
import { QbStatusProvider, useQbStatus } from "./lib/qb-status";
import { THEME_INIT_SCRIPT } from "./lib/theme";

export const links: LinksFunction = () => [
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
];

function AppShell() {
  const { online } = useQbStatus();
  const disabled = !online;

  return (
    <>
      <PlatformRoot
        mobile={<MobileAppShell disabled={disabled} />}
        desktop={<DesktopAppShell disabled={disabled} />}
      />
      {import.meta.env.DEV ? <DebugPagesNav /> : null}
      {import.meta.env.DEV ? <ForceMobileToggle /> : null}
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className="min-h-dvh bg-background text-foreground antialiased dark:bg-[#141414]"
        suppressHydrationWarning
      >
        {children}
        <ScrollRestoration />
        <Scripts />
        {import.meta.env.DEV ? (
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              // Runs at HTML parse time (before hydrate). Survives React replacing
              // #document on hydration failure and re-attaches wiped Vite/critical CSS.
              __html: `(function(){function has(){if(document.querySelector("[data-dev-css-recovery],[data-react-router-critical-css]"))return true;var s=document.querySelectorAll("style[data-vite-dev-id]");for(var i=0;i<s.length;i++){if((s[i].getAttribute("data-vite-dev-id")||"").indexOf("index.css")!==-1)return true}return false}function ensure(){if(!document.head||has())return;var l=document.createElement("link");l.rel="stylesheet";l.href="/@react-router/critical.css?pathname="+encodeURIComponent(location.pathname);l.setAttribute("data-dev-css-recovery","");document.head.appendChild(l)}ensure();new MutationObserver(ensure).observe(document,{childList:true,subtree:true});[0,50,100,250,500,1000,2000,4000].forEach(function(ms){setTimeout(ensure,ms)})})();`,
            }}
          />
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(w){w.unregister()});caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})})}`,
          }}
        />
      </body>
    </html>
  );
}

export default function Root() {
  const app = (
    <MaindataProvider>
      <QbStatusProvider>
        <AppShell />
      </QbStatusProvider>
    </MaindataProvider>
  );

  return import.meta.env.DEV ? (
    <QbDebugProvider>{app}</QbDebugProvider>
  ) : (
    app
  );
}
