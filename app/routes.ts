import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),
  route("/search", "./routes/search.tsx"),
  route("/library", "./routes/library.tsx"),
  route("/settings", "./routes/settings.tsx"),
  route("/torrents", "./routes/torrents.tsx"), // redirects to /library
  // Host for app/dev-pages/*.tsx — glob-loaded; add/delete files only (404 outside DEV).
  route("/dev/:slug", "./routes/dev.$slug.tsx", { id: "dev-pages" }),
  // Chrome DevTools Automatic Workspace Folders probe (avoids noisy 404 logs)
  route(
    "/.well-known/appspecific/com.chrome.devtools.json",
    "./routes/well-known.chrome-devtools.ts",
  ),
  route("/api/search", "./routes/api.search.ts"),
  route("/api/search_files", "./routes/api.search_files.ts"),
  route("/api/imdb_search", "./routes/api.imdb_search.ts"),
  route("/api/imdb_meta", "./routes/api.imdb_meta.ts"),
  route("/api/image_proxy", "./routes/api.image_proxy.ts"),
  route("/api/tv_show", "./routes/api.tv_show.ts"),
  route("/api/download", "./routes/api.download.ts"),
  route("/api/torrents", "./routes/api.torrents.ts"),
  route("/api/torrent/pause", "./routes/api.torrent.pause.ts"),
  route("/api/torrent/resume", "./routes/api.torrent.resume.ts"),
  route("/api/torrent/recheck", "./routes/api.torrent.recheck.ts"),
  route("/api/torrent/reannounce", "./routes/api.torrent.reannounce.ts"),
  route("/api/torrent_files", "./routes/api.torrent_files.ts"),
  route("/api/torrent_pieces", "./routes/api.torrent_pieces.ts"),
  route("/api/download_file", "./routes/api.download_file.ts"),
  route("/api/settings", "./routes/api.settings.ts"),
  route("/api/qb_status", "./routes/api.qb_status.ts"),
  route("/api/app_version", "./routes/api.app_version.ts"),
] satisfies RouteConfig;
