import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),
  route("/search", "./routes/search.tsx"),
  route("/torrents", "./routes/torrents.tsx"),
  route("/api/search", "./routes/api.search.ts"),
  route("/api/download", "./routes/api.download.ts"),
  route("/api/torrents", "./routes/api.torrents.ts"),
  route("/api/torrent/pause", "./routes/api.torrent.pause.ts"),
  route("/api/torrent/resume", "./routes/api.torrent.resume.ts"),
  route("/api/torrent/recheck", "./routes/api.torrent.recheck.ts"),
  route("/api/torrent/reannounce", "./routes/api.torrent.reannounce.ts"),
  route("/api/torrent_files", "./routes/api.torrent_files.ts"),
  route("/api/download_file", "./routes/api.download_file.ts"),
] satisfies RouteConfig;
