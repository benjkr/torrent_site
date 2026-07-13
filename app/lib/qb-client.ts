import { QBittorrent } from "@ctrl/qbittorrent";

export const qb = new QBittorrent({
  baseUrl: "http://localhost:8080/",
  username: "admin",
  password: "Password123",
});
