import { execSync } from "node:child_process";

import type { AppVersion } from "@/lib/app-version";

function git(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

/** Live git tag + short commit (server / DEV only). */
export function readAppVersionFromGit(): AppVersion {
  return {
    tag: git("git describe --tags --abbrev=0", "0.0.0"),
    commit: git("git rev-parse --short HEAD", "unknown"),
  };
}
