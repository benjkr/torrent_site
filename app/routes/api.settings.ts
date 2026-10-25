import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { qb } from "../lib/qb-client";
import {
  APP_SETTINGS_KEYS,
  type AppSettings,
  type AppSettingsKey,
} from "../lib/types";

const ALLOWED_KEYS = new Set<string>(APP_SETTINGS_KEYS);

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toAppSettings(prefs: Awaited<ReturnType<typeof qb.getPreferences>>): AppSettings {
  return {
    save_path: prefs.save_path ?? "",
    temp_path: prefs.temp_path ?? "",
    temp_path_enabled: Boolean(prefs.temp_path_enabled),
    start_paused_enabled: Boolean(prefs.start_paused_enabled),
    create_subfolder_enabled: Boolean(prefs.create_subfolder_enabled),
    dl_limit: asNumber(prefs.dl_limit, -1),
    up_limit: asNumber(prefs.up_limit, -1),
    queueing_enabled: Boolean(prefs.queueing_enabled),
    max_active_downloads: asNumber(prefs.max_active_downloads, 3),
    max_active_uploads: asNumber(prefs.max_active_uploads, 3),
    max_active_torrents: asNumber(prefs.max_active_torrents, 5),
  };
}

function parseInteger(
  value: unknown,
  key: AppSettingsKey,
  opts?: { min?: number; max?: number },
): number | { error: string } {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { error: `${key} must be a number` };
  }
  const int = Math.trunc(value);
  if (opts?.min !== undefined && int < opts.min) {
    return { error: `${key} must be >= ${opts.min}` };
  }
  if (opts?.max !== undefined && int > opts.max) {
    return { error: `${key} must be <= ${opts.max}` };
  }
  return int;
}

/**
 * Accept only the keys shown in Settings. Reject unknown fields so callers
 * cannot mutate arbitrary qBittorrent preferences through this API.
 */
function parsePreferences(body: unknown): Partial<AppSettings> | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "invalid settings body" };
  }

  const record = body as Record<string, unknown>;
  const unknownKeys = Object.keys(record).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return { error: `unknown settings: ${unknownKeys.join(", ")}` };
  }

  const updates: Partial<AppSettings> = {};

  if ("save_path" in record) {
    if (typeof record.save_path !== "string") {
      return { error: "save_path must be a string" };
    }
    const path = record.save_path.trim();
    if (!path) return { error: "save_path is required" };
    updates.save_path = path;
  }

  if ("temp_path" in record) {
    if (typeof record.temp_path !== "string") {
      return { error: "temp_path must be a string" };
    }
    updates.temp_path = record.temp_path.trim();
  }

  for (const key of [
    "temp_path_enabled",
    "start_paused_enabled",
    "create_subfolder_enabled",
    "queueing_enabled",
  ] as const) {
    if (key in record) {
      if (typeof record[key] !== "boolean") {
        return { error: `${key} must be a boolean` };
      }
      updates[key] = record[key];
    }
  }

  for (const key of ["dl_limit", "up_limit"] as const) {
    if (key in record) {
      const parsed = parseInteger(record[key], key, { min: -1 });
      if (typeof parsed === "object") return parsed;
      updates[key] = parsed;
    }
  }

  for (const key of [
    "max_active_downloads",
    "max_active_uploads",
    "max_active_torrents",
  ] as const) {
    if (key in record) {
      const parsed = parseInteger(record[key], key, { min: 0 });
      if (typeof parsed === "object") return parsed;
      updates[key] = parsed;
    }
  }

  return updates;
}

export async function loader(
  _args: LoaderFunctionArgs,
): Promise<AppSettings | { error: string }> {
  try {
    const prefs = await qb.getPreferences();
    return toAppSettings(prefs);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load qBittorrent preferences",
    };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST" && request.method !== "PUT") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = parsePreferences(body);
    if ("error" in parsed) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Object.keys(parsed).length === 0) {
      return new Response(JSON.stringify({ error: "no settings provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only the allowlisted Partial<AppSettings> is forwarded to qB.
    await qb.setPreferences(parsed);
    const prefs = await qb.getPreferences();
    return { status: "ok" as const, settings: toAppSettings(prefs) };
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to save preferences",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
