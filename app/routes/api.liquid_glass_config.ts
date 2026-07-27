/**
 * DEV-only: read/write `liquid-glass.config.json`.
 * This module is not registered in production route config (see routes.ts).
 * Extra guards below refuse any accidental import/use outside DEV.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  formatLiquidGlassConfigJson,
  parseLiquidGlassConfig,
  LIQUID_GLASS_CONFIG,
} from "@/lib/liquid-glass/config";

const CONFIG_REL = path.join(
  "app",
  "lib",
  "liquid-glass",
  "liquid-glass.config.json",
);

function configPath(): string {
  return path.resolve(process.cwd(), CONFIG_REL);
}

function isDevRuntime(): boolean {
  return import.meta.env.DEV === true && process.env.NODE_ENV !== "production";
}

function notFound() {
  return new Response("Not Found", { status: 404 });
}

/** Read committed liquid-glass params (DEV only). */
export async function loader(_args: LoaderFunctionArgs) {
  if (!isDevRuntime()) return notFound();
  return Response.json({
    ok: true,
    config: LIQUID_GLASS_CONFIG,
    path: CONFIG_REL,
  });
}

/** Write liquid-glass.config.json into the repo (DEV only). User commits afterwards. */
export async function action({ request }: ActionFunctionArgs) {
  if (!isDevRuntime()) return notFound();
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "POST required" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const config = parseLiquidGlassConfig(body);
  const file = configPath();
  try {
    await writeFile(file, formatLiquidGlassConfigJson(config), "utf8");
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "failed to write config file",
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, config, path: CONFIG_REL });
}
