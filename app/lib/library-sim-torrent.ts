import type { FileInfo, TorrentInfo } from "@/lib/types";

/** Stable hash so the sim card is easy to recognize and never hits real APIs. */
export const LIBRARY_SIM_HASH = "sim-debug-torrent-hash";

export type LibrarySimScenario =
  | "off"
  | "downloading"
  | "paused"
  | "stalled"
  | "queued"
  | "seeding"
  | "finished"
  | "error";

export function isLibrarySimHash(hash: string) {
  return hash === LIBRARY_SIM_HASH;
}

const SIM_SIZE = 8_589_934_592; // 8 GiB
const SIM_ADDED_ON = Math.floor(Date.now() / 1000) - 45 * 60;

const SCENARIO_BASE: Record<
  Exclude<LibrarySimScenario, "off">,
  Partial<TorrentInfo>
> = {
  downloading: {
    progress: 0.42,
    state: "downloading",
    dlspeed: 2_500_000,
    upspeed: 120_000,
    eta: 2_100,
    num_seeds: 48,
    num_leechs: 12,
    completion_on: 0,
    ratio: 0.08,
  },
  paused: {
    progress: 0.42,
    state: "pausedDL",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    num_seeds: 48,
    num_leechs: 12,
    completion_on: 0,
    ratio: 0.08,
  },
  stalled: {
    progress: 0.67,
    state: "stalledDL",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    num_seeds: 2,
    num_leechs: 0,
    completion_on: 0,
    ratio: 0.15,
  },
  queued: {
    progress: 0.05,
    state: "queuedDL",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    num_seeds: 10,
    num_leechs: 4,
    completion_on: 0,
    ratio: 0,
  },
  seeding: {
    progress: 1,
    state: "uploading",
    dlspeed: 0,
    upspeed: 1_800_000,
    eta: 8640000,
    num_seeds: 1,
    num_leechs: 6,
    completion_on: SIM_ADDED_ON + 1800,
    ratio: 1.42,
  },
  finished: {
    progress: 1,
    state: "pausedUP",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    num_seeds: 1,
    num_leechs: 0,
    completion_on: SIM_ADDED_ON + 1800,
    ratio: 1.42,
  },
  error: {
    progress: 0.31,
    state: "error",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    num_seeds: 0,
    num_leechs: 0,
    completion_on: 0,
    ratio: 0,
  },
};

export function makeLibrarySimTorrent(
  scenario: Exclude<LibrarySimScenario, "off">,
  overrides?: Partial<TorrentInfo>,
): TorrentInfo {
  return {
    hash: LIBRARY_SIM_HASH,
    name: "Simulator.Torrent.2024.1080p.BluRay.x264-DEBUG",
    size: SIM_SIZE,
    save_path: "/sim/library",
    added_on: SIM_ADDED_ON,
    category: "debug",
    // Real IMDb id so cover / dominant-color progress can load in DEV.
    tags: "imdb:tt0133093",
    num_seeds: 0,
    num_leechs: 0,
    progress: 0,
    state: "downloading",
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    completion_on: 0,
    ratio: 0,
    ...SCENARIO_BASE[scenario],
    ...overrides,
  };
}

/** Fake file list for the sim card’s files viewer (no API). */
export function makeLibrarySimFiles(progress: number): FileInfo[] {
  const p = Math.min(1, Math.max(0, progress));
  return [
    {
      name: "Simulator.Torrent.2024.1080p.BluRay.x264-DEBUG/Simulator.mkv",
      size: SIM_SIZE - 12_000_000,
      progress: p,
      priority: 1,
      is_seed: p >= 1,
      availability: p >= 1 ? 1 : 0.85,
    },
    {
      name: "Simulator.Torrent.2024.1080p.BluRay.x264-DEBUG/sample.mkv",
      size: 8_000_000,
      progress: Math.min(1, p * 1.2),
      priority: 1,
      is_seed: p >= 0.9,
      availability: 1,
    },
    {
      name: "Simulator.Torrent.2024.1080p.BluRay.x264-DEBUG/readme.txt",
      size: 4_000_000,
      progress: 1,
      priority: 0,
      is_seed: true,
      availability: 1,
    },
  ];
}

/** Toggle between active and paused variants of the current scenario. */
export function toggleLibrarySimPaused(
  scenario: Exclude<LibrarySimScenario, "off">,
  paused: boolean,
): { state: string; dlspeed: number; upspeed: number } {
  if (scenario === "seeding" || scenario === "finished") {
    return paused
      ? { state: "pausedUP", dlspeed: 0, upspeed: 0 }
      : { state: "uploading", dlspeed: 0, upspeed: 1_800_000 };
  }
  if (scenario === "error" || scenario === "stalled" || scenario === "queued") {
    return paused
      ? { state: "pausedDL", dlspeed: 0, upspeed: 0 }
      : {
          state: SCENARIO_BASE[scenario].state!,
          dlspeed: SCENARIO_BASE[scenario].dlspeed ?? 0,
          upspeed: SCENARIO_BASE[scenario].upspeed ?? 0,
        };
  }
  // downloading / paused
  return paused
    ? { state: "pausedDL", dlspeed: 0, upspeed: 0 }
    : { state: "downloading", dlspeed: 2_500_000, upspeed: 120_000 };
}
