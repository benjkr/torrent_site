import type { QbConnectionSettings } from "./types";

function env(name: string): string {
  // Dynamic key avoids Vite inlining at build time; values come from runtime env files.
  return (process.env[name] ?? "").trim();
}

function normalizeBaseUrl(url: string): string {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

/** Load qB connection from QB_BASE_URL / QB_USERNAME / QB_PASSWORD. */
export function loadQbConnection(): QbConnectionSettings {
  const baseUrl = normalizeBaseUrl(env("QB_BASE_URL"));
  const username = env("QB_USERNAME");
  const password = env("QB_PASSWORD");

  if (!baseUrl || !username) {
    throw new Error(
      "Missing qBittorrent env: set QB_BASE_URL and QB_USERNAME (see .env.development or .env.production.example)",
    );
  }

  return { baseUrl, username, password };
}
