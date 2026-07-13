import type { LinksFunction } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { NavLink } from "react-router";

import "./index.css";

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

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 h-12">
            <NavLink
              to="/search"
              className="font-semibold text-sm tracking-tight hover:text-foreground/80 transition-colors"
            >
              Torrent Site
            </NavLink>
            <div className="flex items-center gap-2 ml-auto sm:ml-4">
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `text-xs px-2 py-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`
                }
              >
                Search
              </NavLink>
              <NavLink
                to="/torrents"
                className={({ isActive }) =>
                  `text-xs px-2 py-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`
                }
              >
                Active Torrents
              </NavLink>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
