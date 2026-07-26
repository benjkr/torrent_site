import { QBittorrent } from "@ctrl/qbittorrent";
import { loadQbConnection } from "./qb-connection";

const initial = loadQbConnection();

export const qb = new QBittorrent({
  baseUrl: initial.baseUrl,
  username: initial.username,
  password: initial.password,
});
